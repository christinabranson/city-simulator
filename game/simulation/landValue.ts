import type { LandValueTier, Tile } from "@/types/game";

export const getLandValueTier = (landValue: number): LandValueTier => {
  if (landValue < 20) {
    return "slum";
  }
  if (landValue < 40) {
    return "basic";
  }
  if (landValue < 70) {
    return "suburban";
  }
  return "highValue";
};

export const summarizeLandValue = (
  tiles: Tile[]
): { averageLandValue: number; landValueTierCounts: Record<LandValueTier, number> } => {
  const counts: Record<LandValueTier, number> = {
    slum: 0,
    basic: 0,
    suburban: 0,
    highValue: 0
  };

  if (tiles.length === 0) {
    return { averageLandValue: 0, landValueTierCounts: counts };
  }

  let total = 0;
  for (const tile of tiles) {
    total += tile.landValue;
    counts[getLandValueTier(tile.landValue)] += 1;
  }

  return {
    averageLandValue: Math.round(total / tiles.length),
    landValueTierCounts: counts
  };
};
