import { BUILDINGS } from "@/game/models/buildings";
import type { GameStateSnapshot, Tile } from "@/types/game";

export interface SimulationHooks {
  onBuildingConstructionComplete?: (tile: Tile) => void;
  onResourceProduced?: (resource: string, amount: number) => void;
}

export interface SimulationResult {
  snapshot: GameStateSnapshot;
  producedTotals: Partial<Record<string, number>>;
}

const cloneSnapshot = (snapshot: GameStateSnapshot): GameStateSnapshot => ({
  ...snapshot,
  resources: { ...snapshot.resources },
  tiles: snapshot.tiles.map((tile) => ({ ...tile })),
  gifts: [...snapshot.gifts]
});

export const runSimulation = (
  snapshot: GameStateSnapshot,
  now: number,
  hooks?: SimulationHooks
): SimulationResult => {
  const next = cloneSnapshot(snapshot);
  const producedTotals: Partial<Record<string, number>> = {};

  for (const tile of next.tiles) {
    if (!tile.buildingId) {
      continue;
    }
    const definition = BUILDINGS[tile.buildingId];

    if (!tile.constructed) {
      if (tile.constructionCompleteAt && now >= tile.constructionCompleteAt) {
        tile.constructed = true;
        tile.lastProducedAt = tile.constructionCompleteAt;
        hooks?.onBuildingConstructionComplete?.(tile);
      } else {
        continue;
      }
    }

    const lastProduced = tile.lastProducedAt ?? next.lastSimulatedAt;
    const cycleMs = definition.production.cycleSeconds * 1000;
    const completedCycles = Math.floor((now - lastProduced) / cycleMs);

    if (completedCycles <= 0) {
      continue;
    }

    const producedAmount = completedCycles * definition.production.amountPerCycle;
    const resource = definition.production.resource;

    next.resources[resource] += producedAmount;
    tile.lastProducedAt = lastProduced + completedCycles * cycleMs;
    producedTotals[resource] = (producedTotals[resource] ?? 0) + producedAmount;
    hooks?.onResourceProduced?.(resource, producedAmount);
  }

  next.lastSimulatedAt = now;
  return { snapshot: next, producedTotals };
};
