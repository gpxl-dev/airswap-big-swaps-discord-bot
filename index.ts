import dotenv from "dotenv";
dotenv.config();

import { ethers, Contract, BigNumber, utils, Event } from "ethers";

import lightContractAbi from "./lightContractAbi";
import erc20Abi from "./erc20Abi";
import getTokenPriceFromContractAddress from "./coingecko";
import { sendSwapEmbed } from "./discord";
import { shouldSendToDiscord } from "./filtering";

const provider = ethers.getDefaultProvider("homestead", {
  infura: process.env.INFURA_PROJECT_ID,
});

const lightContractAddress = process.env.SWAP_CONTRACT_ADDRESS;

if (!lightContractAddress) throw new Error("No swap contract address set");

const lightContract = new Contract(
  lightContractAddress,
  lightContractAbi,
  provider
);

const getSymbolAndDecimalsForTokenFromAddress = async (address: string) => {
  const contract = new Contract(address, erc20Abi, provider);
  const decimalsPromise: Promise<number> = contract.decimals();
  const symbolPromse: Promise<string> = contract.symbol();
  const [decimals, symbol] = await Promise.all([decimalsPromise, symbolPromse]);
  return {
    decimals,
    symbol,
  };
};

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
    const senderTokenInfoPromise = getSymbolAndDecimalsForTokenFromAddress(
      senderToken
    );
    const senderTokenPricePromise = getTokenPriceFromContractAddress(
      senderToken
    );
    const signerTokenInfoPromise = getSymbolAndDecimalsForTokenFromAddress(
      signerToken
    );
    const signerTokenPricePromise = getTokenPriceFromContractAddress(
      signerToken
    );
    const transactionPromise = event.getTransaction();
    const [
      senderTokenInfo,
      signerTokenInfo,
      senderTokenPrice,
      signerTokenPrice,
      transaction,
    ] = await Promise.all([
      senderTokenInfoPromise,
      signerTokenInfoPromise,
      senderTokenPricePromise,
      signerTokenPricePromise,
      transactionPromise,
    ]);

    const sentUnits = parseFloat(
      utils.formatUnits(senderAmount, senderTokenInfo.decimals)
    );
    const sentValue = sentUnits * senderTokenPrice;
    const receivedUnits = parseFloat(
      utils.formatUnits(signerAmount, signerTokenInfo.decimals)
    );
    const receivedValue = receivedUnits * signerTokenPrice;
    const fee = signerAmount
      .div(BigNumber.from(10000).sub(signerFee))
      .mul(signerFee);
    const feeUnits = parseFloat(
      utils.formatUnits(fee, signerTokenInfo.decimals)
    );
    const feeValue = feeUnits * signerTokenPrice;

    const averageValue = (sentValue + receivedValue) / 2;

    if (process.env.LOG_ALL_SWAPS === "true") {
      console.log(
        `${sentUnits.toFixed(3)} ${senderTokenInfo.symbol} -> ` +
          `${receivedUnits.toFixed(3)} ${
            signerTokenInfo.symbol
          } ($${utils.commify(averageValue.toFixed(2))})`
      );
    }

    if (shouldSendToDiscord(averageValue)) {
      sendSwapEmbed({
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
      });
    }
  }
);
