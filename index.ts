import * as dotenv from "dotenv";
dotenv.config();

import { ethers, Contract, BigNumber, utils, Event } from "ethers";

import { writeFile, readFile } from "fs/promises";

import { fetchTokens } from "@airswap/metadata";
import { chainIds } from "@airswap/constants";
import * as LightContract from "@airswap/light/build/contracts/Light.json";
import lightDeploys from "@airswap/light/deploys";
import * as RegistryContract from "@airswap/registry/build/contracts/Registry.sol/Registry.json";
import registryDeploys from "@airswap/registry/deploys";

import getTokenPriceFromContractAddress from "./coingecko";
import {
  init,
  sendAddTokensEmbed,
  sendIfMeetsCriteria,
  sendMessage,
  sendSwapEmbed,
} from "./discord";

const provider = ethers.providers.InfuraProvider.getWebSocketProvider(
  "homestead",
  process.env.INFURA_PROJECT_ID
);

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

export type AddTokensDetails = {
  makerAddress: string;
  tokenSymbols: string[];
  txHash: string;
};

let lastBlockChecked: number | null = null;
const start = async () => {
  console.log("Starting big swap bot");
  await init();
  console.log("Configs loaded & discord ready");

  const { tokens } = await fetchTokens(chainIds.MAINNET);
  console.log("Token list fetched");

  const lightContract = new Contract(
    lightDeploys[1],
    LightContract.abi,
    provider
  );

  const onSwap = async (event: Event) => {
    const {
      nonce,
      timestamp,
      signerWallet,
      signerToken,
      signerAmount,
      signerFee,
      senderWallet,
      senderToken,
      senderAmount,
    } = event.args! as unknown as {
      nonce: BigNumber;
      timestamp: BigNumber;
      signerWallet: string;
      signerToken: string;
      signerAmount: BigNumber;
      signerFee: BigNumber;
      senderWallet: string;
      senderToken: string;
      senderAmount: BigNumber;
    };
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

    const [senderTokenPrice, signerTokenPrice, transaction] = await Promise.all(
      [senderTokenPricePromise, signerTokenPricePromise, transactionPromise]
    );

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
  };

  const check = async (onSwap: (event: Event) => void) => {
    let fromBlock, persistedBlock;
    const toBlock = await provider.getBlockNumber();

    if (lastBlockChecked) {
      fromBlock = lastBlockChecked + 1;
    } else if (
      (persistedBlock = parseInt((await readFile(".lastBlock")).toString()))
    ) {
      fromBlock = persistedBlock + 1;
    } else {
      // Start without specifying block, skip check this time.
      lastBlockChecked = toBlock;
      return;
    }
    console.log(`Checking blocks ${fromBlock} -> ${toBlock}`);
    try {
      const events = await lightContract.queryFilter(
        lightContract.filters.Swap(),
        fromBlock,
        toBlock
      );
      events.forEach((e) => {
        try {
          onSwap(e);
        } catch (error: any) {
          console.log("Failed to check swap", error);
        }
      });
      writeFile(".lastBlock", toBlock.toString());
      lastBlockChecked = toBlock;
    } catch (e: any) {
      console.log(`Error checking block: ${e.message}`);
    }
  };

  check(onSwap);
  setInterval(check, 3 * 60 * 1000);

  // const registryContract = new Contract(
  //   registryDeploys[1],
  //   RegistryContract.abi,
  //   provider
  // );

  // const handleTokenChange = async (
  //   isRemove: boolean,
  //   senderAddress: string,
  //   tokenAddresses: string[],
  //   event: Event
  // ) => {
  //   const tokenSymbols = tokenAddresses.map((address) => {
  //     const tokenInfo = tokens.find(
  //       (token) => token.address === address.toLowerCase()
  //     );
  //     return (
  //       tokenInfo?.symbol || `[???]((https://etherscan.io/address/${address})`
  //     );
  //   });
  //   const tx = await event.getTransaction();
  //   sendAddTokensEmbed(
  //     {
  //       makerAddress: senderAddress,
  //       tokenSymbols,
  //       txHash: tx.hash,
  //     },
  //     isRemove
  //   );
  // };

  // registryContract.on("AddTokens", handleTokenChange.bind(null, false));
  // registryContract.on("RemoveTokens", handleTokenChange.bind(null, true));
};

start();
