import { BUILDINGS } from "@/game/models/buildings";
import { summarizeLandValue } from "@/game/simulation/landValue";
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
  gifts: [...snapshot.gifts],
  cityMetrics: { ...snapshot.cityMetrics }
});

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const getNeighbors = (tile: Tile, indexByCoordinate: Map<string, number>): number[] => {
  const offsets: Array<[number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
  ];
  const neighbors: number[] = [];
  for (const [dx, dy] of offsets) {
    const idx = indexByCoordinate.get(`${tile.x + dx},${tile.y + dy}`);
    if (idx !== undefined) {
      neighbors.push(idx);
    }
  }
  return neighbors;
};

const getNearbyCategoryCount = (
  tiles: Tile[],
  center: Tile,
  category: "industrial" | "civic" | "recreation"
): number => {
  let count = 0;
  for (const tile of tiles) {
    if (!tile.constructed || !tile.buildingId) {
      continue;
    }
    const definition = BUILDINGS[tile.buildingId];
    if (definition.category !== category) {
      continue;
    }
    const distance = Math.abs(tile.x - center.x) + Math.abs(tile.y - center.y);
    if (distance > 0 && distance <= 2) {
      count += 1;
    }
  }
  return count;
};

const processConstructionAndProduction = (
  next: GameStateSnapshot,
  now: number,
  hooks?: SimulationHooks
): Partial<Record<string, number>> => {
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

  return producedTotals;
};

const spreadPollution = (next: GameStateSnapshot, elapsedMinutes: number): void => {
  if (elapsedMinutes <= 0) {
    return;
  }

  const indexByCoordinate = new Map<string, number>();
  next.tiles.forEach((tile, index) => {
    indexByCoordinate.set(`${tile.x},${tile.y}`, index);
  });

  for (const tile of next.tiles) {
    if (!tile.constructed || !tile.buildingId) {
      continue;
    }
    const pollutionGenerated = BUILDINGS[tile.buildingId].pollution ?? 0;
    if (pollutionGenerated > 0) {
      tile.pollution += pollutionGenerated * elapsedMinutes;
    }
  }

  const spreadRatio = Math.min(0.2 * elapsedMinutes, 0.8);
  const deltas = new Array<number>(next.tiles.length).fill(0);

  for (let index = 0; index < next.tiles.length; index += 1) {
    const tile = next.tiles[index];
    if (tile.pollution <= 0 || spreadRatio <= 0) {
      continue;
    }
    const neighbors = getNeighbors(tile, indexByCoordinate);
    if (neighbors.length === 0) {
      continue;
    }
    const spreadAmount = tile.pollution * spreadRatio;
    deltas[index] -= spreadAmount;
    const eachNeighbor = spreadAmount / neighbors.length;
    for (const neighbor of neighbors) {
      deltas[neighbor] += eachNeighbor;
    }
  }

  for (let index = 0; index < next.tiles.length; index += 1) {
    next.tiles[index].pollution = Math.max(0, next.tiles[index].pollution + deltas[index]);
  }

  const decayFactor = Math.pow(0.95, elapsedMinutes);
  for (const tile of next.tiles) {
    tile.pollution = Math.max(0, tile.pollution * decayFactor);
  }
};

const calculatePopulationAndJobs = (
  next: GameStateSnapshot
): {
  population: number;
  jobs: number;
  unemploymentRate: number;
  commercialJobs: number;
  industrialJobs: number;
} => {
  let population = 0;
  let jobs = 0;
  let commercialJobs = 0;
  let industrialJobs = 0;
  for (const tile of next.tiles) {
    if (!tile.constructed || !tile.buildingId) {
      continue;
    }
    const definition = BUILDINGS[tile.buildingId];
    population += definition.population ?? 0;
    const tileJobs = definition.jobs ?? 0;
    jobs += tileJobs;
    if (definition.category === "commercial") {
      commercialJobs += tileJobs;
    } else if (definition.category === "industrial") {
      industrialJobs += tileJobs;
    }
  }
  const unemploymentRate = population > 0 ? Math.max(0, population - jobs) / population : 0;
  return { population, jobs, unemploymentRate, commercialJobs, industrialJobs };
};

const calculateDemand = (
  population: number,
  jobs: number,
  commercialJobs: number,
  industrialJobs: number
): { residential: number; commercial: number; industrial: number } => {
  const jobGap = jobs - population;
  const workerGap = population - jobs;

  const residential = clamp(Math.round(jobGap * 7), -100, 100);
  const commercial = clamp(Math.round(workerGap * 6 + (population - commercialJobs) * 3), -100, 100);
  const industrial = clamp(Math.round(workerGap * 5 + (population - industrialJobs) * 2), -100, 100);

  return { residential, commercial, industrial };
};

const calculateLandValueAndHappiness = (
  next: GameStateSnapshot,
  unemploymentRate: number
): void => {
  for (const tile of next.tiles) {
    const nearbyRecreation = getNearbyCategoryCount(next.tiles, tile, "recreation");
    const nearbyCivic = getNearbyCategoryCount(next.tiles, tile, "civic");
    const nearbyIndustrial = getNearbyCategoryCount(next.tiles, tile, "industrial");
    const building = tile.buildingId ? BUILDINGS[tile.buildingId] : null;

    const landValueRaw =
      50 +
      nearbyRecreation * 6 +
      nearbyCivic * 4 +
      (building?.landValueBonus ?? 0) -
      nearbyIndustrial * 5 -
      tile.pollution * 0.6;
    tile.landValue = clamp(landValueRaw, 0, 100);

    let happinessRaw =
      55 +
      nearbyRecreation * 7 +
      nearbyCivic * 6 +
      tile.landValue * 0.2 -
      nearbyIndustrial * 4 -
      tile.pollution * 1.1;
    if (building?.category === "residential") {
      happinessRaw -= unemploymentRate * 25;
    }
    tile.happiness = clamp(happinessRaw, 0, 100);
  }
};

const collectTaxes = (next: GameStateSnapshot, population: number, jobs: number, elapsedMinutes: number): void => {
  const employedCitizens = Math.min(population, jobs);
  const taxIncome = Math.floor(employedCitizens * 0.05 * elapsedMinutes);
  if (taxIncome > 0) {
    next.resources.coins += taxIncome;
  }
};

export const runSimulation = (
  snapshot: GameStateSnapshot,
  now: number,
  hooks?: SimulationHooks
): SimulationResult => {
  const next = cloneSnapshot(snapshot);
  const elapsedMinutes = Math.max(0, (now - next.lastSimulatedAt) / 60_000);
  const producedTotals = processConstructionAndProduction(next, now, hooks);
  const { population, jobs, unemploymentRate, commercialJobs, industrialJobs } =
    calculatePopulationAndJobs(next);
  const demand = calculateDemand(population, jobs, commercialJobs, industrialJobs);
  spreadPollution(next, elapsedMinutes);
  calculateLandValueAndHappiness(next, unemploymentRate);
  collectTaxes(next, population, jobs, elapsedMinutes);
  const { averageLandValue, landValueTierCounts } = summarizeLandValue(next.tiles);
  next.cityMetrics = {
    population,
    jobs,
    unemploymentRate,
    averageLandValue,
    landValueTierCounts,
    demand,
    averageHappiness:
      next.tiles.length > 0
        ? Math.round(next.tiles.reduce((sum, tile) => sum + tile.happiness, 0) / next.tiles.length)
        : 0
  };

  next.lastSimulatedAt = now;
  return { snapshot: next, producedTotals };
};
