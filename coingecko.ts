import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 4 * 60 * 1000;

type SimplePriceResponse = {
  [contractAddress: string]: {
    usd: number;
  };
};

const cache: Record<string, { price: number, expiry: number }> = {};

const getTokenPriceFromContractAddress = async (address: string) => {
  const _address = address.toLowerCase();
  const hasCache = !!cache[_address];
  const cacheStale = !hasCache || (cache[_address].expiry < Date.now());

  if (!cacheStale) {
    return cache[_address].price;
  }
  else {
    try {
      const url =
        `${BASE_URL}/simple/token_price/ethereum?contract_addresses=${_address}` +
        "&vs_currencies=usd";
      const response = await axios.get<SimplePriceResponse>(url);
      cache[_address] = {
        price: response.data[_address].usd,
        expiry: Date.now() + CACHE_DURATION
      }
      return cache[_address].price;
    } catch (e:any) {
      console.error(`Unable to get price from coingecko for ${_address}:`, e);
      if (hasCache) return cache[_address].price;
      else return null;
    }
  }
};

export default getTokenPriceFromContractAddress;
