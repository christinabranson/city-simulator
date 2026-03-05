export type ResourceType = "coins" | "energy";
export type BuildingId =
  | "house"
  | "solarFarm"
  | "shop"
  | "warehouse"
  | "park";

export type Resources = Record<ResourceType, number>;

export type Cost = Partial<Resources>;

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  emoji: string;
  colorClass: string;
  constructionSeconds: number;
  cost: Cost;
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
}

export interface ConstructionQueueItem {
  tileKey: string;
  x: number;
  y: number;
  buildingId: BuildingId;
  buildingName: string;
  readyAt: number;
}
