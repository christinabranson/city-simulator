import { create } from "zustand";

import { BUILDINGS } from "@/game/models/buildings";
import { MOCK_CITIES } from "@/game/models/mockCities";
import { loadSnapshot, saveSnapshot } from "@/game/persistence/localStorage";
import { runSimulation } from "@/game/simulation/engine";
import type {
  BuildingId,
  GameStateSnapshot,
  GiftLogEntry,
  ResourceType,
  Tile
} from "@/types/game";

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

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

const createInitialSnapshot = (): GameStateSnapshot => ({
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  resources: {
    coins: 120,
    energy: 10
  },
  tiles: makeTiles(GRID_WIDTH, GRID_HEIGHT),
  lastSimulatedAt: Date.now(),
  gifts: []
});

const canAfford = (snapshot: GameStateSnapshot, buildingId: BuildingId): boolean => {
  const definition = BUILDINGS[buildingId];
  return Object.entries(definition.cost).every(
    ([resource, amount]) => snapshot.resources[resource as ResourceType] >= (amount ?? 0)
  );
};

const deductCost = (snapshot: GameStateSnapshot, buildingId: BuildingId): GameStateSnapshot => {
  const definition = BUILDINGS[buildingId];
  const next = {
    ...snapshot,
    resources: { ...snapshot.resources },
    tiles: snapshot.tiles.map((tile) => ({ ...tile })),
    gifts: [...snapshot.gifts]
  };
  for (const [resource, amount] of Object.entries(definition.cost)) {
    next.resources[resource as ResourceType] -= amount ?? 0;
  }
  return next;
};

const persist = (snapshot: GameStateSnapshot): void => {
  saveSnapshot(snapshot);
};

interface UiState {
  selectedBuildingId: BuildingId | null;
  hydrated: boolean;
  activeNeighborCityId: string | null;
  nextAutoSimAt: number | null;
}

interface GameActions {
  hydrateFromStorage: () => void;
  selectBuilding: (buildingId: BuildingId | null) => void;
  placeBuilding: (x: number, y: number) => void;
  simulateNow: () => void;
  setNextAutoSimAt: (timestamp: number | null) => void;
  giftResource: (resource: ResourceType, amount: number) => void;
  visitNeighborCity: (cityId: string) => void;
}

type GameStore = GameStateSnapshot & UiState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialSnapshot(),
  selectedBuildingId: null,
  hydrated: false,
  activeNeighborCityId: null,
  nextAutoSimAt: null,

  hydrateFromStorage: () => {
    if (get().hydrated) {
      return;
    }
    const loaded = loadSnapshot();
    const base = loaded ?? createInitialSnapshot();
    const simulated = runSimulation(base, Date.now()).snapshot;
    persist(simulated);
    set({
      ...simulated,
      hydrated: true
    });
  },

  selectBuilding: (buildingId) => {
    set({ selectedBuildingId: buildingId });
  },

  placeBuilding: (x, y) => {
    const state = get();
    if (!state.selectedBuildingId) {
      return;
    }

    const current = runSimulation(
      {
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        resources: state.resources,
        tiles: state.tiles,
        lastSimulatedAt: state.lastSimulatedAt,
        gifts: state.gifts
      },
      Date.now()
    ).snapshot;

    const targetTile = current.tiles.find((tile) => tile.x === x && tile.y === y);
    if (!targetTile || targetTile.buildingId) {
      set({ ...current });
      persist(current);
      return;
    }

    const buildingId = state.selectedBuildingId;
    if (!canAfford(current, buildingId)) {
      set({ ...current });
      persist(current);
      return;
    }

    const afterCost = deductCost(current, buildingId);
    const now = Date.now();
    const definition = BUILDINGS[buildingId];
    const placedTiles = afterCost.tiles.map((tile) =>
      tile.x === x && tile.y === y
        ? {
            ...tile,
            buildingId,
            constructed: false,
            constructionStartedAt: now,
            constructionCompleteAt: now + definition.constructionSeconds * 1000,
            lastProducedAt: null
          }
        : tile
    );

    const nextSnapshot: GameStateSnapshot = {
      ...afterCost,
      tiles: placedTiles,
      lastSimulatedAt: now
    };

    set({
      ...nextSnapshot
    });
    persist(nextSnapshot);
  },

  simulateNow: () => {
    const state = get();
    const simulated = runSimulation(
      {
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        resources: state.resources,
        tiles: state.tiles,
        lastSimulatedAt: state.lastSimulatedAt,
        gifts: state.gifts
      },
      Date.now()
    ).snapshot;
    set({
      ...simulated
    });
    persist(simulated);
  },

  setNextAutoSimAt: (timestamp) => {
    set({ nextAutoSimAt: timestamp });
  },

  giftResource: (resource, amount) => {
    const state = get();
    const simulated = runSimulation(
      {
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        resources: state.resources,
        tiles: state.tiles,
        lastSimulatedAt: state.lastSimulatedAt,
        gifts: state.gifts
      },
      Date.now()
    ).snapshot;

    if (simulated.resources[resource] < amount) {
      set({ ...simulated });
      persist(simulated);
      return;
    }

    const gift: GiftLogEntry = {
      id: `${resource}-${Date.now()}`,
      resource,
      amount,
      timestamp: Date.now()
    };
    const nextSnapshot: GameStateSnapshot = {
      ...simulated,
      resources: {
        ...simulated.resources,
        [resource]: simulated.resources[resource] - amount
      },
      gifts: [gift, ...simulated.gifts].slice(0, 15),
      lastSimulatedAt: Date.now()
    };

    set({ ...nextSnapshot });
    persist(nextSnapshot);
  },

  visitNeighborCity: (cityId) => {
    if (!MOCK_CITIES.some((city) => city.id === cityId)) {
      return;
    }
    set({ activeNeighborCityId: cityId });
  }
}));
