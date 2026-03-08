import type { BuildingDefinition, BuildingId } from "@/types/game";
import { BUILDING_COSTS, BUILDING_UPGRADE_COSTS } from "@/game/models/pricing";

export const BUILDINGS: Record<BuildingId, BuildingDefinition> = {
  house: {
    id: "house",
    name: "House",
    category: "residential",
    emoji: "🏠",
    colorClass: "bg-blue-700",
    constructionSeconds: 5,
    cost: BUILDING_COSTS.house,
    population: 5,
    upgradeTo: "townhouse",
    upgradeCost: BUILDING_UPGRADE_COSTS.house,
    upgradeCriteria: {
      minLandValue: 45,
      minHappiness: 55
    },
    production: { resource: "coins", amountPerCycle: 2, cycleSeconds: 60 }
  },
  townhouse: {
    id: "townhouse",
    name: "Townhouse",
    category: "residential",
    emoji: "🏘️",
    colorClass: "bg-indigo-700",
    constructionSeconds: 7,
    cost: BUILDING_COSTS.townhouse,
    population: 8,
    upgradeTo: "apartment",
    upgradeCost: BUILDING_UPGRADE_COSTS.townhouse,
    upgradeCriteria: {
      minLandValue: 70,
      minHappiness: 65
    },
    production: { resource: "coins", amountPerCycle: 3, cycleSeconds: 60 }
  },
  apartment: {
    id: "apartment",
    name: "Apartment",
    category: "residential",
    emoji: "🏢",
    colorClass: "bg-sky-700",
    constructionSeconds: 10,
    cost: BUILDING_COSTS.apartment,
    population: 14,
    production: { resource: "coins", amountPerCycle: 5, cycleSeconds: 60 }
  },
  shop: {
    id: "shop",
    name: "Shop",
    category: "commercial",
    emoji: "🏪",
    colorClass: "bg-amber-700",
    constructionSeconds: 10,
    cost: BUILDING_COSTS.shop,
    jobs: 4,
    upgradeTo: "supermarket",
    upgradeCost: BUILDING_UPGRADE_COSTS.shop,
    upgradeCriteria: {
      minLandValue: 60,
      minHappiness: 60
    },
    production: { resource: "coins", amountPerCycle: 6, cycleSeconds: 60 }
  },
  supermarket: {
    id: "supermarket",
    name: "Supermarket",
    category: "commercial",
    emoji: "🛒",
    colorClass: "bg-amber-600",
    constructionSeconds: 14,
    cost: BUILDING_COSTS.supermarket,
    jobs: 9,
    production: { resource: "coins", amountPerCycle: 14, cycleSeconds: 60 }
  },
  factory: {
    id: "factory",
    name: "Factory",
    category: "industrial",
    emoji: "🏭",
    colorClass: "bg-violet-700",
    constructionSeconds: 14,
    cost: BUILDING_COSTS.factory,
    jobs: 10,
    pollution: 15,
    upgradeTo: "manufacturingPlant",
    upgradeCost: BUILDING_UPGRADE_COSTS.factory,
    upgradeCriteria: {
      minLandValue: 35,
      minHappiness: 40
    },
    production: { resource: "coins", amountPerCycle: 10, cycleSeconds: 60 }
  },
  manufacturingPlant: {
    id: "manufacturingPlant",
    name: "Manufacturing Plant",
    category: "industrial",
    emoji: "🏗️",
    colorClass: "bg-violet-600",
    constructionSeconds: 18,
    cost: BUILDING_COSTS.manufacturingPlant,
    jobs: 16,
    pollution: 20,
    production: { resource: "coins", amountPerCycle: 22, cycleSeconds: 60 }
  },
  school: {
    id: "school",
    name: "School",
    category: "civic",
    emoji: "🏫",
    colorClass: "bg-cyan-700",
    constructionSeconds: 12,
    cost: BUILDING_COSTS.school,
    upgradeTo: "college",
    upgradeCost: BUILDING_UPGRADE_COSTS.school,
    upgradeCriteria: {
      minLandValue: 55,
      minHappiness: 58
    },
    serviceProvider: {
      type: "education",
      radius: 3
    },
    production: { resource: "energy", amountPerCycle: 0, cycleSeconds: 60 }
  },
  college: {
    id: "college",
    name: "College",
    category: "civic",
    emoji: "🎓",
    colorClass: "bg-cyan-600",
    constructionSeconds: 18,
    cost: BUILDING_COSTS.college,
    serviceProvider: {
      type: "education",
      radius: 5
    },
    jobs: 6,
    production: { resource: "energy", amountPerCycle: 2, cycleSeconds: 60 }
  },
  park: {
    id: "park",
    name: "Park",
    category: "recreation",
    emoji: "🌳",
    colorClass: "bg-green-700",
    constructionSeconds: 6,
    cost: BUILDING_COSTS.park,
    landValueBonus: 8,
    serviceProvider: {
      type: "recreation",
      radius: 2
    },
    production: { resource: "energy", amountPerCycle: 1, cycleSeconds: 60 }
  },
  waterPump: {
    id: "waterPump",
    name: "Water Pump",
    category: "civic",
    emoji: "🚰",
    colorClass: "bg-blue-600",
    constructionSeconds: 10,
    cost: BUILDING_COSTS.waterPump,
    requiresAdjacentLandmark: "lake",
    production: { resource: "water", amountPerCycle: 6, cycleSeconds: 60 }
  },
  hydroPlant: {
    id: "hydroPlant",
    name: "Hydro Plant",
    category: "civic",
    emoji: "⚡",
    colorClass: "bg-indigo-600",
    constructionSeconds: 14,
    cost: BUILDING_COSTS.hydroPlant,
    requiresAdjacentLandmark: "lake",
    production: { resource: "energy", amountPerCycle: 10, cycleSeconds: 60 }
  },
  solarFarm: {
    id: "solarFarm",
    name: "Solar Farm",
    category: "civic",
    emoji: "🔋",
    colorClass: "bg-emerald-700",
    constructionSeconds: 8,
    cost: BUILDING_COSTS.solarFarm,
    jobs: 2,
    production: { resource: "energy", amountPerCycle: 2, cycleSeconds: 60 }
  },
  warehouse: {
    id: "warehouse",
    name: "Warehouse",
    category: "industrial",
    emoji: "📦",
    colorClass: "bg-slate-700",
    constructionSeconds: 12,
    cost: BUILDING_COSTS.warehouse,
    jobs: 6,
    pollution: 8,
    production: { resource: "coins", amountPerCycle: 8, cycleSeconds: 60 }
  }
};

const BUILDING_PALETTE_ORDER: BuildingId[] = [
  "waterPump",
  "hydroPlant",
  "solarFarm",
  "park",
  "school",
  "college",
  "house",
  "townhouse",
  "shop",
  "supermarket",
  "factory",
  "manufacturingPlant",
  "warehouse",
  "apartment"
];

export const BUILDING_LIST = BUILDING_PALETTE_ORDER.map((id) => BUILDINGS[id]);
