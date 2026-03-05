import type { BuildingDefinition, BuildingId } from "@/types/game";

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  house: {
    id: "house",
    name: "House",
    category: "residential",
    emoji: "🏠",
    colorClass: "bg-blue-700",
    constructionSeconds: 5,
    cost: { coins: 20 },
    population: 5,
    upgradeTo: "townhouse",
    upgradeCost: { coins: 35, energy: 1 },
    upgradeCriteria: {
      minLandValue: 45,
      minHappiness: 55
    },
    production: { resource: "coins", amountPerCycle: 2, cycleSeconds: 10 }
  },
  townhouse: {
    id: "townhouse",
    name: "Townhouse",
    category: "residential",
    emoji: "🏘️",
    colorClass: "bg-indigo-700",
    constructionSeconds: 7,
    cost: { coins: 40, energy: 2 },
    population: 8,
    upgradeTo: "apartment",
    upgradeCost: { coins: 55, energy: 2 },
    upgradeCriteria: {
      minLandValue: 70,
      minHappiness: 65
    },
    production: { resource: "coins", amountPerCycle: 3, cycleSeconds: 10 }
  },
  apartment: {
    id: "apartment",
    name: "Apartment",
    category: "residential",
    emoji: "🏢",
    colorClass: "bg-sky-700",
    constructionSeconds: 10,
    cost: { coins: 65, energy: 3 },
    population: 14,
    production: { resource: "coins", amountPerCycle: 5, cycleSeconds: 10 }
  },
  shop: {
    id: "shop",
    name: "Shop",
    category: "commercial",
    emoji: "🏪",
    colorClass: "bg-amber-700",
    constructionSeconds: 10,
    cost: { coins: 45, energy: 3 },
    jobs: 4,
    production: { resource: "coins", amountPerCycle: 6, cycleSeconds: 20 }
  },
  factory: {
    id: "factory",
    name: "Factory",
    category: "industrial",
    emoji: "🏭",
    colorClass: "bg-violet-700",
    constructionSeconds: 14,
    cost: { coins: 65, energy: 4 },
    jobs: 10,
    pollution: 15,
    production: { resource: "coins", amountPerCycle: 10, cycleSeconds: 30 }
  },
  school: {
    id: "school",
    name: "School",
    category: "civic",
    emoji: "🏫",
    colorClass: "bg-cyan-700",
    constructionSeconds: 12,
    cost: { coins: 50, energy: 2 },
    production: { resource: "energy", amountPerCycle: 0, cycleSeconds: 30 }
  },
  park: {
    id: "park",
    name: "Park",
    category: "recreation",
    emoji: "🌳",
    colorClass: "bg-green-700",
    constructionSeconds: 6,
    cost: { coins: 25 },
    landValueBonus: 8,
    production: { resource: "energy", amountPerCycle: 1, cycleSeconds: 12 }
  },
  solarFarm: {
    id: "solarFarm",
    name: "Solar Farm",
    category: "civic",
    emoji: "🔋",
    colorClass: "bg-emerald-700",
    constructionSeconds: 8,
    cost: { coins: 30 },
    jobs: 2,
    production: { resource: "energy", amountPerCycle: 2, cycleSeconds: 8 }
  },
  warehouse: {
    id: "warehouse",
    name: "Warehouse",
    category: "industrial",
    emoji: "📦",
    colorClass: "bg-slate-700",
    constructionSeconds: 12,
    cost: { coins: 55, energy: 4 },
    jobs: 6,
    pollution: 8,
    production: { resource: "coins", amountPerCycle: 8, cycleSeconds: 24 }
  }
};

const BUILDING_PALETTE_ORDER: BuildingId[] = ["house", "shop", "factory", "school", "park"];

export const BUILDING_LIST = BUILDING_PALETTE_ORDER.map((id) => BUILDINGS[id]);
