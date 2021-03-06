import * as dotenv from "dotenv";
dotenv.config();

import { ethers, Contract, BigNumber, utils, Event } from "ethers";

import { fetchTokens } from "@airswap/metadata";
import { chainIds } from "@airswap/constants";
import * as LightContract from "@airswap/light/build/contracts/Light.json";
import * as lightDeploys from "@airswap/light/deploys.json";

import getTokenPriceFromContractAddress from "./coingecko";
import {
  init,
  sendIfMeetsCriteria,
  sendMessage,
  sendSwapEmbed,
} from "./discord";

const provider = ethers.getDefaultProvider("homestead", {
  infura: process.env.INFURA_PROJECT_ID,
});

if (!process.env.COMMAND_PREFIX) throw new Error("Command prefix not set.");

export type SwapDetails = {
  averageValue: number;
  timestamp: number;
  senderTokens: string;
  signerTokens: string;
  usdValue: string;
  airswapFee: string;
  makerAddress: string;
  txHash: string;
};

const start = async () => {
  console.log("Starting big swap bot");
  await init();
  console.log("Configs loaded & discord ready");

  const tokens = await fetchTokens(chainIds.MAINNET);
  console.log("Token list fetched");

  const lightContract = new Contract(
    lightDeploys[1],
    LightContract.abi,
    provider
  );

  lightContract.on(
    "Swap",
    async (
      nonce: BigNumber,
      timestamp: BigNumber,
      signerWallet: string,
      signerToken: string,
      signerAmount: BigNumber,
      signerFee: BigNumber,
      senderWallet: string,
      senderToken: string,
      senderAmount: BigNumber,
      event: Event
    ) => {
      // Fetch coinGecko USD prices
      const senderTokenPricePromise =
        getTokenPriceFromContractAddress(senderToken);
      const signerTokenPricePromise =
        getTokenPriceFromContractAddress(signerToken);

      // Get the transaction from the event for an etherscan link
      const transactionPromise = event.getTransaction();

      const senderTokenInfo = tokens.find(
        (token) => token.address === senderToken.toLowerCase()
      );
      const signerTokenInfo = tokens.find(
        (token) => token.address === signerToken.toLowerCase()
      );

      if (!senderTokenInfo || !signerTokenInfo) {
        console.log(
          `Observed swap for unsupported pair: ${senderToken} -> ${signerToken}`
        );
        return;
      }

      const [senderTokenPrice, signerTokenPrice, transaction] =
        await Promise.all([
          senderTokenPricePromise,
          signerTokenPricePromise,
          transactionPromise,
        ]);

      // Stats about sent tokens
      const sentUnits = parseFloat(
        utils.formatUnits(senderAmount, senderTokenInfo.decimals)
      );
      const sentValue = sentUnits * senderTokenPrice;

      // Stats about received tokens.
      const receivedUnits = parseFloat(
        utils.formatUnits(signerAmount, signerTokenInfo.decimals)
      );
      const receivedValue = receivedUnits * signerTokenPrice;

      // Fee is in basis points (0.01%, which is 1/10000)
      const fee = signerAmount
        .div(BigNumber.from(10000).sub(signerFee))
        .mul(signerFee);
      const feeUnits = parseFloat(
        utils.formatUnits(fee, signerTokenInfo.decimals)
      );

      const feeValue = feeUnits * signerTokenPrice;

      // Calculate average usd value of sent and received tokens.
      const averageValue = (sentValue + receivedValue) / 2;

      // Log swaps for debug purposes
      if (process.env.LOG_ALL_SWAPS === "true") {
        console.log(
          `${sentUnits.toFixed(3)} ${senderTokenInfo.symbol} -> ` +
            `${receivedUnits.toFixed(3)} ${
              signerTokenInfo.symbol
            } ($${utils.commify(averageValue.toFixed(2))})`
        );
      }

      const swapDetails: SwapDetails = {
        averageValue,
        timestamp: timestamp.toNumber() * 1000,
        airswapFee: `$${utils.commify(feeValue.toFixed(2))}`,
        makerAddress: signerWallet,
        senderTokens: `${utils.commify(sentUnits.toFixed(2))} ${
          senderTokenInfo.symbol
        }`,
        signerTokens: `${utils.commify(receivedUnits.toFixed(2))} ${
          signerTokenInfo.symbol
        }`,
        usdValue: `$${utils.commify(averageValue.toFixed(2))}`,
        txHash: transaction.hash,
      };

      // Check if parameters require discord message and send details if so.
      sendIfMeetsCriteria(swapDetails);
    }
  );
};

start();
