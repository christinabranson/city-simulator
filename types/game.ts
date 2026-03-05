export type ResourceType = "coins" | "energy";
export type DemandType = "residential" | "commercial" | "industrial";
export type LandValueTier = "slum" | "basic" | "suburban" | "highValue";
export type RoadType = "none" | "road" | "heavyRoad" | "highway";
export type ServiceType = "education" | "recreation";
export type ToastType = "success" | "info" | "warning" | "error";
export type BuildingCategory =
  | "residential"
  | "commercial"
  | "industrial"
  | "civic"
  | "recreation";

export type BuildingId =
  | "house"
  | "townhouse"
  | "apartment"
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
  upgradeTo?: BuildingId;
  upgradeCost?: Cost;
  upgradeCriteria?: {
    minLandValue: number;
    minHappiness: number;
  };
  serviceProvider?: {
    type: ServiceType;
    radius: number;
  };
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
  roadType: RoadType;
  constructed: boolean;
  isActive: boolean;
  inactiveReason: string | null;
  constructionStartedAt: number | null;
  constructionCompleteAt: number | null;
  lastProducedAt: number | null;
  pollution: number;
  landValue: number;
  happiness: number;
  serviceCoverage: Record<ServiceType, boolean>;
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
    averageLandValue: number;
    landValueTierCounts: Record<LandValueTier, number>;
    demand: Record<DemandType, number>;
    serviceCoverageCounts: Record<ServiceType, number>;
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

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
  durationMs: number;
}
