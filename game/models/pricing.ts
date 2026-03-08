import type { BuildingId, Cost, ResourceType, RoadType } from "@/types/game";

export const BUILDING_COSTS: Record<BuildingId, Cost> = {
  house: { coins: 20 },
  townhouse: { coins: 40, energy: 2 },
  apartment: { coins: 65, energy: 3 },
  shop: { coins: 45, energy: 3 },
  supermarket: { coins: 120, energy: 6 },
  factory: { coins: 65, energy: 4 },
  manufacturingPlant: { coins: 150, energy: 10 },
  school: { coins: 50, energy: 2 },
  college: { coins: 140, energy: 8 },
  park: { coins: 25 },
  waterPump: { coins: 45, energy: 2 },
  hydroPlant: { coins: 70, water: 2 },
  solarFarm: { coins: 30 },
  warehouse: { coins: 55, energy: 4 }
};

export const BUILDING_UPGRADE_COSTS: Partial<Record<BuildingId, Cost>> = {
  house: { coins: 35, energy: 1 },
  townhouse: { coins: 55, energy: 2 },
  shop: { coins: 80, energy: 4 },
  factory: { coins: 110, energy: 8 },
  school: { coins: 90, energy: 6 }
};

export const MOVE_COST_RATIO = 0.1;

export const ROAD_COSTS: Record<Exclude<RoadType, "none">, Cost> = {
  road: { coins: 2 },
  heavyRoad: { coins: 6, energy: 1 },
  highway: { coins: 14, energy: 2 }
};

export const LAND_EXPANSION = {
  widthStep: 2,
  heightStep: 2,
  landmarkChance: 0.18,
  surveyCooldownMs: 45_000,
  resurveyCost: { coins: 18, energy: 1 } as Cost
} as const;

export const ROI_RESOURCE_WEIGHTS: Record<ResourceType, number> = {
  coins: 1,
  energy: 9,
  water: 7
};

export const ROI_VALUE_SCORE_WEIGHTS = {
  population: 3,
  jobs: 2,
  landValueBonus: 1.5,
  serviceRadius: 8,
  pollutionPenalty: 1.4,
  scale: 100
} as const;

export const getLandExpansionCost = (currentWidth: number, currentHeight: number): Cost => {
  const area = currentWidth * currentHeight;
  const tier = Math.max(1, Math.floor(area / 64));
  return {
    coins: 90 + tier * 35,
    energy: 8 + tier * 2
  };
};
