import type { Cost, ResourceType } from "@/types/game";

export const getScaledCost = (cost: Cost, ratio: number): Cost => {
  const scaled: Cost = {};
  for (const [resource, amount] of Object.entries(cost)) {
    if (!amount || amount <= 0) {
      continue;
    }
    scaled[resource as ResourceType] = Math.max(1, Math.ceil(amount * ratio));
  }
  return scaled;
};
