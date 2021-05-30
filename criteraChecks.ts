import { SwapDetails } from ".";
import { SwapCriteria } from "./guildConfig";

const matchesCriteria = (swapDetails: SwapDetails, critera: SwapCriteria) => {
  const { averageValue } = swapDetails;
  let { upperThreshold, lowerThreshold } = critera;
  if (!upperThreshold) upperThreshold = Infinity;
  if (!lowerThreshold) lowerThreshold = -Infinity;
  return lowerThreshold <= averageValue && averageValue <= upperThreshold;
};
export { matchesCriteria };
