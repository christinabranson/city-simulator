export const MOVE_COST_RATIO = 0.1;

export const ROAD_COSTS = {
  road: { coins: 2 },
  heavyRoad: { coins: 6, energy: 1 },
  highway: { coins: 14, energy: 2 }
} as const;
