import type { Tile } from "@/types/game";

export interface MockCity {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Tile[];
}

const makeTiles = (width: number, height: number): Tile[] => {
  const out: Tile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      out.push({
        x,
        y,
        buildingId: null,
        constructed: false,
        constructionStartedAt: null,
        constructionCompleteAt: null,
        lastProducedAt: null
      });
    }
  }
  return out;
};

export const MOCK_CITIES: MockCity[] = [
  {
    id: "neighbor-a",
    name: "Bayview Town",
    width: 6,
    height: 6,
    tiles: makeTiles(6, 6).map((tile) => {
      if (tile.x === 2 && tile.y === 1) {
        return { ...tile, buildingId: "house", constructed: true, lastProducedAt: Date.now() };
      }
      if (tile.x === 4 && tile.y === 4) {
        return { ...tile, buildingId: "park", constructed: true, lastProducedAt: Date.now() };
      }
      return tile;
    })
  },
  {
    id: "neighbor-b",
    name: "Harbor Square",
    width: 6,
    height: 6,
    tiles: makeTiles(6, 6).map((tile) => {
      if (tile.x === 1 && tile.y === 2) {
        return { ...tile, buildingId: "shop", constructed: true, lastProducedAt: Date.now() };
      }
      if (tile.x === 3 && tile.y === 3) {
        return {
          ...tile,
          buildingId: "solarFarm",
          constructed: true,
          lastProducedAt: Date.now()
        };
      }
      return tile;
    })
  }
];
