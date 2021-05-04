const swapThreshold = parseFloat(process.env.USD_SWAP_THRESHOLD || "100000");

const shouldSendToDiscord = (value: number) => {
  return value > swapThreshold;
};

export { shouldSendToDiscord };
