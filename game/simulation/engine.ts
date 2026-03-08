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
  tiles: snapshot.tiles.map((tile) => ({
    ...tile,
    serviceCoverage: { ...tile.serviceCoverage }
  })),
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

const hasAdjacentRoad = (tile: Tile, tiles: Tile[], indexByCoordinate: Map<string, number>): boolean => {
  const neighbors = getNeighbors(tile, indexByCoordinate);
  return neighbors.some((neighborIndex) => tiles[neighborIndex].roadType !== "none");
};

const roadTierValue = (roadType: Tile["roadType"]): number => {
  if (roadType === "heavyRoad") {
    return 1;
  }
  if (roadType === "highway") {
    return 2;
  }
  return 0;
};

const getRoadAccessQuality = (
  tile: Tile,
  tiles: Tile[],
  indexByCoordinate: Map<string, number>
): number => {
  const neighbors = getNeighbors(tile, indexByCoordinate);
  return neighbors.reduce((maxTier, neighborIndex) => {
    const tier = roadTierValue(tiles[neighborIndex].roadType);
    return Math.max(maxTier, tier);
  }, 0);
};

const getNearbyCategoryCount = (
  tiles: Tile[],
  center: Tile,
  category: "residential" | "commercial" | "industrial" | "civic" | "recreation"
): number => {
  let count = 0;
  for (const tile of tiles) {
    if (!tile.constructed || !tile.buildingId || !tile.isActive) {
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

const getAdjacentCategoryCount = (
  tiles: Tile[],
  center: Tile,
  category: "residential" | "commercial" | "industrial" | "civic" | "recreation"
): number =>
  tiles.filter((tile) => {
    if (!tile.constructed || !tile.buildingId || !tile.isActive) {
      return false;
    }
    const definition = BUILDINGS[tile.buildingId];
    if (definition.category !== category) {
      return false;
    }
    const distance = Math.abs(tile.x - center.x) + Math.abs(tile.y - center.y);
    return distance === 1;
  }).length;

const getNearbyLandmarkCount = (tiles: Tile[], center: Tile, landmark: "lake", radius: number): number =>
  tiles.filter((tile) => {
    if (tile.landmark !== landmark) {
      return false;
    }
    const distance = Math.abs(tile.x - center.x) + Math.abs(tile.y - center.y);
    return distance > 0 && distance <= radius;
  }).length;

const processConstructionAndProduction = (
  next: GameStateSnapshot,
  now: number,
  hooks?: SimulationHooks
): Partial<Record<string, number>> => {
  const producedTotals: Partial<Record<string, number>> = {};
  const indexByCoordinate = new Map<string, number>();
  next.tiles.forEach((tile, index) => {
    indexByCoordinate.set(`${tile.x},${tile.y}`, index);
  });

  for (const tile of next.tiles) {
    if (!tile.buildingId) {
      tile.isActive = true;
      tile.inactiveReason = null;
      continue;
    }
    const definition = BUILDINGS[tile.buildingId];

    if (!tile.constructed) {
      if (tile.constructionCompleteAt && now >= tile.constructionCompleteAt) {
        tile.constructed = true;
        tile.lastProducedAt = tile.constructionCompleteAt;
        hooks?.onBuildingConstructionComplete?.(tile);
      } else {
        tile.isActive = false;
        tile.inactiveReason = "Under construction";
        continue;
      }
    }

    const connectedToRoad = hasAdjacentRoad(tile, next.tiles, indexByCoordinate);
    tile.isActive = connectedToRoad;
    tile.inactiveReason = connectedToRoad ? null : "No road access";
    if (!connectedToRoad) {
      continue;
    }

    const lastProduced = tile.lastProducedAt ?? next.lastSimulatedAt;
    const cycleMs = definition.production.cycleSeconds * 1000;
    const completedCycles = Math.floor((now - lastProduced) / cycleMs);

    if (completedCycles <= 0) {
      continue;
    }

    const producedAmount = completedCycles * definition.production.amountPerCycle;
    const resource = definition.production.resource;
    let adjustedProducedAmount = producedAmount;
    if (definition.category === "commercial") {
      const adjacentHomes = getAdjacentCategoryCount(next.tiles, tile, "residential");
      const commercialBonusMultiplier = Math.min(0.5, adjacentHomes * 0.1);
      adjustedProducedAmount = Math.floor(producedAmount * (1 + commercialBonusMultiplier));
    }

    next.resources[resource] += adjustedProducedAmount;
    tile.lastProducedAt = lastProduced + completedCycles * cycleMs;
    producedTotals[resource] = (producedTotals[resource] ?? 0) + adjustedProducedAmount;
    hooks?.onResourceProduced?.(resource, adjustedProducedAmount);
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
    if (!tile.constructed || !tile.buildingId || !tile.isActive) {
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
    if (!tile.constructed || !tile.buildingId || !tile.isActive) {
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
  industrialJobs: number,
  stage: "early" | "mid" | "late"
): { residential: number; commercial: number; industrial: number } => {
  const jobGap = jobs - population;
  const workerGap = population - jobs;

  const tuning =
    stage === "early"
      ? { res: 8, com: 6, ind: 5 }
      : stage === "mid"
        ? { res: 6, com: 5, ind: 4 }
        : { res: 5, com: 4, ind: 3 };

  const residential = clamp(Math.round(jobGap * tuning.res), -100, 100);
  const commercial = clamp(
    Math.round(workerGap * tuning.com + (population - commercialJobs) * (stage === "late" ? 2 : 3)),
    -100,
    100
  );
  const industrial = clamp(
    Math.round(workerGap * tuning.ind + (population - industrialJobs) * (stage === "early" ? 2 : 1)),
    -100,
    100
  );

  return { residential, commercial, industrial };
};

const calculateServiceCoverage = (
  next: GameStateSnapshot
): { education: number; recreation: number } => {
  const indexByCoordinate = new Map<string, number>();
  next.tiles.forEach((tile, index) => {
    indexByCoordinate.set(`${tile.x},${tile.y}`, index);
  });

  for (const tile of next.tiles) {
    tile.serviceCoverage.education = false;
    tile.serviceCoverage.recreation = false;
  }

  for (const sourceTile of next.tiles) {
    if (!sourceTile.constructed || !sourceTile.buildingId || !sourceTile.isActive) {
      continue;
    }
    const provider = BUILDINGS[sourceTile.buildingId].serviceProvider;
    if (!provider) {
      continue;
    }
    const roadBonusRadius = getRoadAccessQuality(sourceTile, next.tiles, indexByCoordinate);
    const effectiveRadius = provider.radius + roadBonusRadius;

    for (const targetTile of next.tiles) {
      const distance = Math.abs(sourceTile.x - targetTile.x) + Math.abs(sourceTile.y - targetTile.y);
      if (distance <= effectiveRadius) {
        targetTile.serviceCoverage[provider.type] = true;
      }
    }
  }

  return next.tiles.reduce(
    (acc, tile) => {
      if (tile.serviceCoverage.education) {
        acc.education += 1;
      }
      if (tile.serviceCoverage.recreation) {
        acc.recreation += 1;
      }
      return acc;
    },
    { education: 0, recreation: 0 }
  );
};

const calculateLandValueAndHappiness = (
  next: GameStateSnapshot,
  unemploymentRate: number
): void => {
  const indexByCoordinate = new Map<string, number>();
  next.tiles.forEach((tile, index) => {
    indexByCoordinate.set(`${tile.x},${tile.y}`, index);
  });

  for (const tile of next.tiles) {
    const nearbyRecreation = getNearbyCategoryCount(next.tiles, tile, "recreation");
    const nearbyCivic = getNearbyCategoryCount(next.tiles, tile, "civic");
    const nearbyIndustrial = getNearbyCategoryCount(next.tiles, tile, "industrial");
    const adjacentRecreation = getAdjacentCategoryCount(next.tiles, tile, "recreation");
    const adjacentIndustrial = getAdjacentCategoryCount(next.tiles, tile, "industrial");
    const adjacentResidential = getAdjacentCategoryCount(next.tiles, tile, "residential");
    const nearbyLakes = getNearbyLandmarkCount(next.tiles, tile, "lake", 2);
    const building = tile.buildingId && tile.isActive ? BUILDINGS[tile.buildingId] : null;
    const roadAccessQuality = tile.isActive ? getRoadAccessQuality(tile, next.tiles, indexByCoordinate) : 0;

    const landValueRaw =
      50 +
      nearbyRecreation * 6 +
      nearbyCivic * 4 +
      (tile.serviceCoverage.recreation ? 6 : 0) +
      (tile.serviceCoverage.education ? 3 : 0) +
      nearbyLakes * 5 +
      (building?.landValueBonus ?? 0) -
      nearbyIndustrial * 5 -
      tile.pollution * 0.6;
    let adjustedLandValueRaw = landValueRaw;
    if (building?.category === "residential") {
      adjustedLandValueRaw += adjacentRecreation * 4 - adjacentIndustrial * 2;
    }
    if (building?.category === "commercial") {
      adjustedLandValueRaw += adjacentResidential * 2;
    }
    tile.landValue = clamp(adjustedLandValueRaw, 0, 100);

    let happinessRaw =
      55 +
      nearbyRecreation * 7 +
      nearbyCivic * 6 +
      (tile.serviceCoverage.recreation ? 8 : 0) +
      (tile.serviceCoverage.education ? 6 : 0) +
      nearbyLakes * 4 +
      roadAccessQuality * 3 +
      tile.landValue * 0.2 -
      nearbyIndustrial * 4 -
      tile.pollution * 1.1;
    if (building?.category === "residential") {
      happinessRaw += adjacentRecreation * 7 - adjacentIndustrial * 10;
    }
    if (building?.category === "commercial") {
      happinessRaw += adjacentResidential * 3;
    }
    if (building?.category === "industrial") {
      happinessRaw -= adjacentResidential * 4;
    }
    if (building?.category === "residential") {
      happinessRaw -= unemploymentRate * 25;
    }
    tile.happiness = clamp(happinessRaw, 0, 100);
  }
};

const getProgressionStage = (population: number, area: number): "early" | "mid" | "late" => {
  if (population >= 160 || area >= 180) {
    return "late";
  }
  if (population >= 70 || area >= 110) {
    return "mid";
  }
  return "early";
};

const collectTaxes = (
  next: GameStateSnapshot,
  population: number,
  jobs: number,
  elapsedMinutes: number,
  stage: "early" | "mid" | "late"
): void => {
  const employedCitizens = Math.min(population, jobs);
  const rate = stage === "early" ? 0.04 : stage === "mid" ? 0.055 : 0.07;
  const taxIncome = Math.floor(employedCitizens * rate * elapsedMinutes);
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

  const initialLaborStats = calculatePopulationAndJobs(next);
  spreadPollution(next, elapsedMinutes);
  calculateServiceCoverage(next);
  calculateLandValueAndHappiness(next, initialLaborStats.unemploymentRate);

  const { population, jobs, unemploymentRate, commercialJobs, industrialJobs } =
    calculatePopulationAndJobs(next);
  const stage = getProgressionStage(population, next.gridWidth * next.gridHeight);
  const demand = calculateDemand(population, jobs, commercialJobs, industrialJobs, stage);
  const serviceCoverageCounts = calculateServiceCoverage(next);
  calculateLandValueAndHappiness(next, unemploymentRate);
  collectTaxes(next, population, jobs, elapsedMinutes, stage);

  const { averageLandValue, landValueTierCounts } = summarizeLandValue(next.tiles);
  next.cityMetrics = {
    population,
    jobs,
    unemploymentRate,
    averageLandValue,
    landValueTierCounts,
    demand,
    serviceCoverageCounts,
    progressionStage: stage,
    averageHappiness:
      next.tiles.length > 0
        ? Math.round(next.tiles.reduce((sum, tile) => sum + tile.happiness, 0) / next.tiles.length)
        : 0
  };

  next.lastSimulatedAt = now;
  return { snapshot: next, producedTotals };
};
