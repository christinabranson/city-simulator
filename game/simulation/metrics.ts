import { BUILDINGS } from "@/game/models/buildings";
import type { GameStateSnapshot, ResourceType } from "@/types/game";

export interface ResourceCycleStat {
  totalPerCycle: number;
  nextCompletionAt: number | null;
}

export type ResourceCycleStats = Record<ResourceType, ResourceCycleStat>;

const emptyStats = (): ResourceCycleStats => ({
  coins: { totalPerCycle: 0, nextCompletionAt: null },
  energy: { totalPerCycle: 0, nextCompletionAt: null }
});

export const getResourceCycleStats = (
  snapshot: Pick<GameStateSnapshot, "tiles" | "lastSimulatedAt">,
  now: number
): ResourceCycleStats => {
  const stats = emptyStats();

  for (const tile of snapshot.tiles) {
    if (!tile.buildingId || !tile.constructed) {
      continue;
    }

    const building = BUILDINGS[tile.buildingId];
    const resource = building.production.resource;
    const cycleMs = building.production.cycleSeconds * 1000;
    const baseline = tile.lastProducedAt ?? snapshot.lastSimulatedAt;
    const elapsedMs = Math.max(0, now - baseline);
    const completedCycles = Math.floor(elapsedMs / cycleMs);
    const nextCompletionAt = baseline + (completedCycles + 1) * cycleMs;

    stats[resource].totalPerCycle += building.production.amountPerCycle;
    if (
      stats[resource].nextCompletionAt === null ||
      nextCompletionAt < (stats[resource].nextCompletionAt as number)
    ) {
      stats[resource].nextCompletionAt = nextCompletionAt;
    }
  }

  return stats;
};
