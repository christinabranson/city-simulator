export type ResourceType = "coins" | "energy";
export type BuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "civic"
  | "recreation";

export type BuildingId =
  | "house"
  | "shop"
  | "factory"
  | "school"
  | "park"
  | "solarFarm"
  | "warehouse";

export type Resources = Record<ResourceType, number>;

export type Cost = Partial<Resources>;

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  category: BuildingCategory;
  emoji: string;
  colorClass: string;
  constructionSeconds: number;
  cost: Cost;
  population?: number;
  jobs?: number;
  pollution?: number;
  landValueBonus?: number;
  production: {
    resource: ResourceType;
    amountPerCycle: number;
    cycleSeconds: number;
  };
}

export interface Tile {
  x: number;
  y: number;
  buildingId: BuildingId | null;
  constructed: boolean;
  constructionStartedAt: number | null;
  constructionCompleteAt: number | null;
  lastProducedAt: number | null;
  pollution: number;
  landValue: number;
  happiness: number;
}

export interface GiftLogEntry {
  id: string;
  resource: ResourceType;
  amount: number;
  timestamp: number;
}

export interface GameStateSnapshot {
  gridWidth: number;
  gridHeight: number;
  resources: Resources;
  tiles: Tile[];
  lastSimulatedAt: number;
  gifts: GiftLogEntry[];
  cityMetrics: {
    population: number;
    jobs: number;
    unemploymentRate: number;
    averageHappiness: number;
  };
}

export interface ConstructionQueueItem {
  tileKey: string;
  x: number;
  y: number;
  buildingId: BuildingId;
  buildingName: string;
  readyAt: number;
}
