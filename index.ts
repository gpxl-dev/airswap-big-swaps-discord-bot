import dotenv from "dotenv";
import { ethers, Contract, BigNumber, utils } from "ethers";

import lightContractAbi from "./lightContractAbi";
import erc20Abi from "./erc20Abi";
import getTokenPriceFromContractAddress from "./coingecko";

dotenv.config();

const provider = ethers.getDefaultProvider("homestead", {
  infura: process.env.INFURA_PROJECT_ID,
});

const lightContractAddress = "0xc549a5c701cb6e6cbc091007a80c089c49595468";
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
    senderAmount: BigNumber
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
    const [
      senderTokenInfo,
      signerTokenInfo,
      senderTokenPrice,
      signerTokenPrice,
    ] = await Promise.all([
      senderTokenInfoPromise,
      signerTokenInfoPromise,
      senderTokenPricePromise,
      signerTokenPricePromise,
    ]);

    const sentUnits = parseFloat(
      utils.formatUnits(senderAmount, senderTokenInfo.decimals)
    );
    const sentPrice = sentUnits * senderTokenPrice;
    const receivedUnits = parseFloat(
      utils.formatUnits(signerAmount, signerTokenInfo.decimals)
    );
    const receivedPrice = receivedUnits * signerTokenPrice;

    const averagePrice = (sentPrice + receivedPrice) / 2;

    console.log(
      `${sentUnits.toFixed(3)} ${senderTokenInfo.symbol} -> ` +
        `${receivedUnits.toFixed(3)} ${
          signerTokenInfo.symbol
        } ($${averagePrice.toFixed(2)})`
    );
  }
);
