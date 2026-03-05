import type { BuildingDefinition, BuildingId } from "@/types/game";

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  house: {
    id: "house",
    name: "House",
    emoji: "🏠",
    colorClass: "bg-blue-700",
    constructionSeconds: 5,
    cost: { coins: 20 },
    production: { resource: "coins", amountPerCycle: 2, cycleSeconds: 10 }
  },
  solarFarm: {
    id: "solarFarm",
    name: "Solar Farm",
    emoji: "🔋",
    colorClass: "bg-emerald-700",
    constructionSeconds: 8,
    cost: { coins: 30 },
    production: { resource: "energy", amountPerCycle: 2, cycleSeconds: 8 }
  },
  shop: {
    id: "shop",
    name: "Shop",
    emoji: "🏪",
    colorClass: "bg-amber-700",
    constructionSeconds: 10,
    cost: { coins: 45, energy: 3 },
    production: { resource: "coins", amountPerCycle: 6, cycleSeconds: 20 }
  },
  warehouse: {
    id: "warehouse",
    name: "Warehouse",
    emoji: "🏭",
    colorClass: "bg-violet-700",
    constructionSeconds: 12,
    cost: { coins: 55, energy: 4 },
    production: { resource: "coins", amountPerCycle: 10, cycleSeconds: 30 }
  },
  park: {
    id: "park",
    name: "Park",
    emoji: "🌳",
    colorClass: "bg-green-700",
    constructionSeconds: 6,
    cost: { coins: 25 },
    production: { resource: "energy", amountPerCycle: 1, cycleSeconds: 12 }
  }
};

export const BUILDING_LIST = Object.values(BUILDINGS);
