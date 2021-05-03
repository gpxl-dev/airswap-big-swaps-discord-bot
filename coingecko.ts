import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

type SimplePriceResponse = {
  [contractAddress: string]: {
    usd: number;
  };
};

const getTokenPriceFromContractAddress = async (address: string) => {
  const url =
    `${BASE_URL}/simple/token_price/ethereum?contract_addresses=${address}` +
    "&vs_currencies=usd";
  const response = await axios.get<SimplePriceResponse>(url);
  return response.data[address.toLowerCase()].usd;
};

export default getTokenPriceFromContractAddress;
