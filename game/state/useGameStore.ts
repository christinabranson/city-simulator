import { create } from "zustand";

import { BUILDINGS } from "@/game/models/buildings";
import { getScaledCost } from "@/game/models/costs";
import { getLandExpansionCost, LAND_EXPANSION, MOVE_COST_RATIO, ROAD_COSTS } from "@/game/models/pricing";
import { MOCK_CITIES } from "@/game/models/mockCities";
import { loadSnapshot, saveSnapshot } from "@/game/persistence/localStorage";
import { runSimulation } from "@/game/simulation/engine";
import type {
  BuildingId,
  Cost,
  GameStateSnapshot,
  GiftLogEntry,
  LandValueTier,
  LandmarkType,
  ProgressionStage,
  ResourceType,
  RoadType,
  ToastMessage,
  ToastType,
  Tile
} from "@/types/game";

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const DEFAULT_LAND_VALUE_TIERS: Record<LandValueTier, number> = {
  slum: 0,
  basic: GRID_WIDTH * GRID_HEIGHT,
  suburban: 0,
  highValue: 0
};

const createDefaultTile = (x: number, y: number): Tile => ({
  x,
  y,
  buildingId: null,
  roadType: "none",
  landmark: null,
  constructed: false,
  isActive: true,
  inactiveReason: null,
  constructionStartedAt: null,
  constructionCompleteAt: null,
  lastProducedAt: null,
  pollution: 0,
  landValue: 50,
  happiness: 60,
  serviceCoverage: {
    education: false,
    recreation: false
  }
});

const makeTiles = (width: number, height: number): Tile[] => {
  const out: Tile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      out.push(createDefaultTile(x, y));
    }
  }
  return out;
};

const createInitialSnapshot = (): GameStateSnapshot => ({
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  resources: {
    coins: 120,
    energy: 10,
    water: 6
  },
  tiles: makeTiles(GRID_WIDTH, GRID_HEIGHT),
  lastSimulatedAt: Date.now(),
  gifts: [],
  cityMetrics: {
    population: 0,
    jobs: 0,
    unemploymentRate: 0,
    averageHappiness: 60,
    averageLandValue: 50,
    landValueTierCounts: { ...DEFAULT_LAND_VALUE_TIERS },
    demand: {
      residential: 0,
      commercial: 0,
      industrial: 0
    },
    serviceCoverageCounts: {
      education: 0,
      recreation: 0
    },
    progressionStage: "early"
  }
});

const normalizeSnapshot = (
  loaded: GameStateSnapshot | null,
  fallback: GameStateSnapshot
): GameStateSnapshot => {
  if (!loaded) {
    return fallback;
  }

  const width = loaded.gridWidth ?? fallback.gridWidth;
  const height = loaded.gridHeight ?? fallback.gridHeight;
  const tiles = makeTiles(width, height).map((baseTile) => {
    const maybeLoadedTile = loaded.tiles?.find((tile) => tile.x === baseTile.x && tile.y === baseTile.y);
    if (!maybeLoadedTile) {
      return baseTile;
    }

    const hasValidBuilding = maybeLoadedTile.buildingId ? Boolean(BUILDINGS[maybeLoadedTile.buildingId]) : true;
    return {
      ...baseTile,
      ...maybeLoadedTile,
      buildingId: hasValidBuilding ? maybeLoadedTile.buildingId : null,
      roadType: maybeLoadedTile.roadType ?? "none",
      landmark: maybeLoadedTile.landmark ?? null,
      isActive: maybeLoadedTile.isActive ?? true,
      inactiveReason: maybeLoadedTile.inactiveReason ?? null,
      pollution: maybeLoadedTile.pollution ?? 0,
      landValue: maybeLoadedTile.landValue ?? 50,
      happiness: maybeLoadedTile.happiness ?? 60,
      serviceCoverage: {
        education: maybeLoadedTile.serviceCoverage?.education ?? false,
        recreation: maybeLoadedTile.serviceCoverage?.recreation ?? false
      }
    };
  });

  return {
    gridWidth: width,
    gridHeight: height,
    resources: { ...fallback.resources, ...loaded.resources },
    tiles,
    lastSimulatedAt: loaded.lastSimulatedAt ?? fallback.lastSimulatedAt,
    gifts: loaded.gifts ?? [],
    cityMetrics: {
      ...fallback.cityMetrics,
      ...loaded.cityMetrics,
      landValueTierCounts: {
        ...fallback.cityMetrics.landValueTierCounts,
        ...(loaded.cityMetrics?.landValueTierCounts ?? {})
      },
      demand: {
        ...fallback.cityMetrics.demand,
        ...(loaded.cityMetrics?.demand ?? {})
      },
      serviceCoverageCounts: {
        ...fallback.cityMetrics.serviceCoverageCounts,
        ...(loaded.cityMetrics?.serviceCoverageCounts ?? {})
      },
      progressionStage: (loaded.cityMetrics?.progressionStage as ProgressionStage | undefined) ?? "early"
    }
  };
};

const snapshotFromState = (state: GameStore): GameStateSnapshot => ({
  gridWidth: state.gridWidth,
  gridHeight: state.gridHeight,
  resources: state.resources,
  tiles: state.tiles,
  lastSimulatedAt: state.lastSimulatedAt,
  gifts: state.gifts,
  cityMetrics: state.cityMetrics
});

const canAfford = (snapshot: GameStateSnapshot, buildingId: BuildingId): boolean => {
  const definition = BUILDINGS[buildingId];
  return Object.entries(definition.cost).every(
    ([resource, amount]) => snapshot.resources[resource as ResourceType] >= (amount ?? 0)
  );
};

const canAffordCost = (snapshot: GameStateSnapshot, cost: Cost | undefined): boolean => {
  if (!cost) {
    return true;
  }
  return Object.entries(cost).every(
    ([resource, amount]) => snapshot.resources[resource as ResourceType] >= (amount ?? 0)
  );
};

const deductCost = (snapshot: GameStateSnapshot, cost: Cost): GameStateSnapshot => {
  const next = {
    ...snapshot,
    resources: { ...snapshot.resources },
    tiles: snapshot.tiles.map((tile) => ({
      ...tile,
      serviceCoverage: { ...tile.serviceCoverage }
    })),
    gifts: [...snapshot.gifts]
  };
  for (const [resource, amount] of Object.entries(cost)) {
    next.resources[resource as ResourceType] -= amount ?? 0;
  }
  return next;
};

const hasAdjacentRoad = (tiles: Tile[], x: number, y: number): boolean => {
  const neighbors = [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y]
  ];
  return neighbors.some(([nx, ny]) => tiles.some((tile) => tile.x === nx && tile.y === ny && tile.roadType !== "none"));
};

const hasAdjacentLandmark = (tiles: Tile[], x: number, y: number, landmark: LandmarkType): boolean => {
  const neighbors = [
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y]
  ];
  return neighbors.some(([nx, ny]) =>
    tiles.some((tile) => tile.x === nx && tile.y === ny && tile.landmark === landmark)
  );
};

const getConstructedCompletions = (previousTiles: Tile[], nextTiles: Tile[]): Tile[] => {
  const previousByKey = new Map(previousTiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
  return nextTiles.filter((tile) => {
    if (!tile.buildingId || !tile.constructed) {
      return false;
    }
    const previous = previousByKey.get(`${tile.x},${tile.y}`);
    return Boolean(previous && previous.buildingId === tile.buildingId && !previous.constructed);
  });
};

interface PlannedExpansionTile {
  x: number;
  y: number;
  landmark: LandmarkType | null;
}

interface PlannedExpansion {
  nextWidth: number;
  nextHeight: number;
  cost: Cost;
  tiles: PlannedExpansionTile[];
}

const createExpansionPlan = (snapshot: GameStateSnapshot): PlannedExpansion => {
  const nextWidth = snapshot.gridWidth + LAND_EXPANSION.widthStep;
  const nextHeight = snapshot.gridHeight + LAND_EXPANSION.heightStep;
  const existingKeys = new Set(snapshot.tiles.map((tile) => `${tile.x},${tile.y}`));
  const tiles: PlannedExpansionTile[] = [];
  for (let y = 0; y < nextHeight; y += 1) {
    for (let x = 0; x < nextWidth; x += 1) {
      const key = `${x},${y}`;
      if (existingKeys.has(key)) {
        continue;
      }
      tiles.push({
        x,
        y,
        landmark: Math.random() < LAND_EXPANSION.landmarkChance ? "lake" : null
      });
    }
  }
  return {
    nextWidth,
    nextHeight,
    cost: getLandExpansionCost(snapshot.gridWidth, snapshot.gridHeight),
    tiles
  };
};

const applyExpansionPlan = (plan: PlannedExpansion): Tile[] =>
  plan.tiles.map((plannedTile) => {
    const base = createDefaultTile(plannedTile.x, plannedTile.y);
    if (plannedTile.landmark === "lake") {
      return {
        ...base,
        landmark: "lake",
        landValue: Math.min(100, base.landValue + 12),
        happiness: Math.min(100, base.happiness + 6)
      };
    }
    return base;
  });

const persist = (snapshot: GameStateSnapshot): void => {
  saveSnapshot(snapshot);
};

interface UiState {
  selectedBuildingId: BuildingId | null;
  selectedRoadType: RoadType | null;
  hydrated: boolean;
  activeNeighborCityId: string | null;
  nextAutoSimAt: number | null;
  nextLandSurveyAt: number | null;
  inspectedTile: { x: number; y: number } | null;
  movingBuilding: { fromX: number; fromY: number; buildingId: BuildingId; moveCost: Cost } | null;
  plannedExpansion: PlannedExpansion | null;
  toasts: ToastMessage[];
}

interface GameActions {
  hydrateFromStorage: () => void;
  selectBuilding: (buildingId: BuildingId | null) => void;
  selectRoadTool: (roadType: Exclude<RoadType, "none"> | null) => void;
  placeBuilding: (x: number, y: number) => void;
  toggleRoad: (x: number, y: number) => void;
  surveyLandExpansion: () => void;
  clearLandSurvey: () => void;
  expandLand: () => void;
  beginMoveTile: (x: number, y: number) => void;
  placeMovedBuilding: (x: number, y: number) => void;
  cancelMove: () => void;
  bulldozeTile: (x: number, y: number) => void;
  upgradeTile: (x: number, y: number) => void;
  inspectTile: (x: number, y: number) => void;
  closeTileInspector: () => void;
  simulateNow: () => void;
  setNextAutoSimAt: (timestamp: number | null) => void;
  pushToast: (type: ToastType, message: string, durationMs?: number) => void;
  dismissToast: (id: string) => void;
  giftResource: (resource: ResourceType, amount: number) => void;
  visitNeighborCity: (cityId: string) => void;
}

type GameStore = GameStateSnapshot & UiState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialSnapshot(),
  selectedBuildingId: null,
  selectedRoadType: null,
  hydrated: false,
  activeNeighborCityId: null,
  nextAutoSimAt: null,
  nextLandSurveyAt: null,
  inspectedTile: null,
  movingBuilding: null,
  plannedExpansion: null,
  toasts: [],

  hydrateFromStorage: () => {
    if (get().hydrated) {
      return;
    }
    const base = normalizeSnapshot(loadSnapshot(), createInitialSnapshot());
    const simulated = runSimulation(base, Date.now()).snapshot;
    persist(simulated);
    set({
      ...simulated,
      hydrated: true
    });
    const completedTiles = getConstructedCompletions(base.tiles, simulated.tiles).slice(0, 3);
    for (const tile of completedTiles) {
      const buildingName = tile.buildingId ? BUILDINGS[tile.buildingId].name : "Building";
      get().pushToast("success", `${buildingName} construction complete.`);
    }
  },

  selectBuilding: (buildingId) => {
    set({ selectedBuildingId: buildingId, selectedRoadType: null, movingBuilding: null });
  },

  selectRoadTool: (roadType) => {
    set({ selectedRoadType: roadType, selectedBuildingId: null, inspectedTile: null, movingBuilding: null });
  },

  placeBuilding: (x, y) => {
    const state = get();
    if (!state.selectedBuildingId) {
      return;
    }

    const current = runSimulation(snapshotFromState(state), Date.now()).snapshot;

    const targetTile = current.tiles.find((tile) => tile.x === x && tile.y === y);
    if (!targetTile || targetTile.buildingId || targetTile.roadType !== "none" || targetTile.landmark) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "Cannot place building on an occupied tile.");
      return;
    }
    if (!hasAdjacentRoad(current.tiles, x, y)) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "Cannot place building: no adjacent road.");
      return;
    }

    const buildingId = state.selectedBuildingId;
    const definition = BUILDINGS[buildingId];
    if (
      definition.requiresAdjacentLandmark &&
      !hasAdjacentLandmark(current.tiles, x, y, definition.requiresAdjacentLandmark)
    ) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", `Cannot place ${definition.name}: must be adjacent to ${definition.requiresAdjacentLandmark}.`);
      return;
    }
    if (!canAfford(current, buildingId)) {
      set({ ...current });
      persist(current);
      get().pushToast("error", "Insufficient resources to place building.");
      return;
    }

    const now = Date.now();
    const afterCost = deductCost(current, definition.cost);
    const placedTiles = afterCost.tiles.map((tile) =>
      tile.x === x && tile.y === y
        ? {
            ...tile,
            buildingId,
            roadType: "none" as const,
            constructed: false,
            isActive: true,
            inactiveReason: null,
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
    get().pushToast("success", `${definition.name} ordered for construction.`);
  },

  toggleRoad: (x, y) => {
    const state = get();
    if (!state.selectedRoadType) {
      return;
    }
    const now = Date.now();
    const current = runSimulation(snapshotFromState(state), now).snapshot;
    const tile = current.tiles.find((candidate) => candidate.x === x && candidate.y === y);
    if (!tile || tile.buildingId || tile.landmark) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "Roads can only be placed on clear tiles.");
      return;
    }

    const selectedRoadType = state.selectedRoadType;
    const nextRoadType = tile.roadType === selectedRoadType ? "none" : selectedRoadType;
    const placingOrChangingRoad = nextRoadType !== "none";
    if (placingOrChangingRoad && !canAffordCost(current, ROAD_COSTS[nextRoadType])) {
      set({ ...current });
      persist(current);
      get().pushToast("error", "Insufficient resources for selected road tier.");
      return;
    }

    const afterRoadCost = placingOrChangingRoad ? deductCost(current, ROAD_COSTS[nextRoadType]) : current;
    const updatedSnapshot: GameStateSnapshot = {
      ...afterRoadCost,
      tiles: afterRoadCost.tiles.map((candidate) =>
        candidate.x === x && candidate.y === y
          ? {
              ...candidate,
              roadType: nextRoadType
            }
          : candidate
      ),
      lastSimulatedAt: now
    };

    const simulated = runSimulation(updatedSnapshot, now).snapshot;
    set({ ...simulated });
    persist(simulated);
    get().pushToast("info", nextRoadType === "none" ? "Road removed." : "Road updated.");
  },

  surveyLandExpansion: () => {
    const state = get();
    const now = Date.now();
    const current = runSimulation(snapshotFromState(state), now).snapshot;
    if (state.nextLandSurveyAt && now < state.nextLandSurveyAt) {
      const remainingSeconds = Math.ceil((state.nextLandSurveyAt - now) / 1000);
      set({ ...current });
      persist(current);
      get().pushToast("warning", `Survey cooldown active: ${remainingSeconds}s remaining.`);
      return;
    }

    const isResurvey = Boolean(state.plannedExpansion);
    if (isResurvey && !canAffordCost(current, LAND_EXPANSION.resurveyCost)) {
      set({ ...current });
      persist(current);
      get().pushToast("error", "Insufficient resources to resurvey.");
      return;
    }

    const afterSurveyCost = isResurvey ? deductCost(current, LAND_EXPANSION.resurveyCost) : current;
    const plan = createExpansionPlan(afterSurveyCost);
    const lakes = plan.tiles.filter((tile) => tile.landmark === "lake").length;
    set({
      ...afterSurveyCost,
      plannedExpansion: plan,
      nextLandSurveyAt: now + LAND_EXPANSION.surveyCooldownMs
    });
    persist(afterSurveyCost);
    get().pushToast(
      "info",
      lakes > 0
        ? `${isResurvey ? "Resurvey" : "Survey"} ready: +${plan.tiles.length} tiles, ${lakes} potential lake landmarks.`
        : `${isResurvey ? "Resurvey" : "Survey"} ready: +${plan.tiles.length} tiles.`
    );
  },

  clearLandSurvey: () => {
    set({ plannedExpansion: null });
    get().pushToast("info", "Land survey cleared.");
  },

  expandLand: () => {
    const state = get();
    const current = runSimulation(snapshotFromState(state), Date.now()).snapshot;
    const expectedWidth = current.gridWidth + LAND_EXPANSION.widthStep;
    const expectedHeight = current.gridHeight + LAND_EXPANSION.heightStep;
    const expansionPlan =
      state.plannedExpansion &&
      state.plannedExpansion.nextWidth === expectedWidth &&
      state.plannedExpansion.nextHeight === expectedHeight
        ? state.plannedExpansion
        : createExpansionPlan(current);

    if (!canAffordCost(current, expansionPlan.cost)) {
      set({ ...current });
      persist(current);
      get().pushToast("error", "Insufficient resources to buy more land.");
      return;
    }

    const newTiles = applyExpansionPlan(expansionPlan);

    const afterCost = deductCost(current, expansionPlan.cost);
    const expandedSnapshot: GameStateSnapshot = {
      ...afterCost,
      gridWidth: expansionPlan.nextWidth,
      gridHeight: expansionPlan.nextHeight,
      tiles: [...afterCost.tiles, ...newTiles],
      lastSimulatedAt: Date.now()
    };
    const simulated = runSimulation(expandedSnapshot, Date.now()).snapshot;
    set({ ...simulated, plannedExpansion: null });
    persist(simulated);

    const lakes = expansionPlan.tiles.filter((tile) => tile.landmark === "lake").length;
    get().pushToast(
      "success",
      lakes > 0
        ? `Land expanded (+${newTiles.length} tiles). ${lakes} lake landmarks discovered.`
        : `Land expanded (+${newTiles.length} tiles).`
    );
  },

  beginMoveTile: (x, y) => {
    const state = get();
    const current = runSimulation(snapshotFromState(state), Date.now()).snapshot;
    const tile = current.tiles.find((candidate) => candidate.x === x && candidate.y === y);
    if (!tile || !tile.constructed || !tile.buildingId) {
      set({ ...current, movingBuilding: null });
      persist(current);
      get().pushToast("warning", "Only completed buildings can be moved.");
      return;
    }

    const definition = BUILDINGS[tile.buildingId];
    const moveCost = getScaledCost(definition.cost, MOVE_COST_RATIO);
    set({
      ...current,
      selectedBuildingId: null,
      selectedRoadType: null,
      inspectedTile: null,
      movingBuilding: {
        fromX: x,
        fromY: y,
        buildingId: tile.buildingId,
        moveCost
      }
    });
    persist(current);
    get().pushToast("info", `Move mode: select a new tile for ${definition.name}.`);
  },

  placeMovedBuilding: (x, y) => {
    const state = get();
    if (!state.movingBuilding) {
      return;
    }
    const { fromX, fromY, buildingId, moveCost } = state.movingBuilding;
    const now = Date.now();
    const current = runSimulation(snapshotFromState(state), now).snapshot;
    const sourceTile = current.tiles.find((candidate) => candidate.x === fromX && candidate.y === fromY);
    const destinationTile = current.tiles.find((candidate) => candidate.x === x && candidate.y === y);

    if (
      !sourceTile ||
      !destinationTile ||
      (x === fromX && y === fromY) ||
      sourceTile.buildingId !== buildingId ||
      !destinationTile ||
      destinationTile.buildingId ||
      destinationTile.landmark !== null ||
      destinationTile.roadType !== "none" ||
      !canAffordCost(current, moveCost)
    ) {
      set({ ...current, movingBuilding: null, inspectedTile: { x: fromX, y: fromY } });
      persist(current);
      get().pushToast("warning", "Move cancelled: invalid destination or insufficient resources.");
      return;
    }
    if (!hasAdjacentRoad(current.tiles, x, y)) {
      set({ ...current, movingBuilding: null, inspectedTile: { x: fromX, y: fromY } });
      persist(current);
      get().pushToast("warning", "Move cancelled: destination needs adjacent road.");
      return;
    }
    const movingDefinition = BUILDINGS[buildingId];
    if (
      movingDefinition.requiresAdjacentLandmark &&
      !hasAdjacentLandmark(current.tiles, x, y, movingDefinition.requiresAdjacentLandmark)
    ) {
      set({ ...current, movingBuilding: null, inspectedTile: { x: fromX, y: fromY } });
      persist(current);
      get().pushToast(
        "warning",
        `Move cancelled: destination must be adjacent to ${movingDefinition.requiresAdjacentLandmark}.`
      );
      return;
    }

    const movedLastProducedAt = sourceTile.lastProducedAt;
    const afterCost = deductCost(current, moveCost);
    const movedSnapshot: GameStateSnapshot = {
      ...afterCost,
      tiles: afterCost.tiles.map((candidate) => {
        if (candidate.x === fromX && candidate.y === fromY) {
          return {
            ...candidate,
            buildingId: null,
            constructed: false,
            isActive: true,
            inactiveReason: null,
            constructionStartedAt: null,
            constructionCompleteAt: null,
            lastProducedAt: null
          };
        }
        if (candidate.x === x && candidate.y === y) {
          return {
            ...candidate,
            buildingId,
            constructed: true,
            isActive: true,
            inactiveReason: null,
            constructionStartedAt: null,
            constructionCompleteAt: null,
            lastProducedAt: movedLastProducedAt
          };
        }
        return candidate;
      }),
      lastSimulatedAt: now
    };

    const simulated = runSimulation(movedSnapshot, now).snapshot;
    set({
      ...simulated,
      movingBuilding: null,
      inspectedTile: null
    });
    persist(simulated);
    get().pushToast("success", `${BUILDINGS[buildingId].name} moved.`);
  },

  cancelMove: () => {
    set({ movingBuilding: null });
    get().pushToast("info", "Move cancelled.");
  },

  bulldozeTile: (x, y) => {
    const state = get();
    const now = Date.now();
    const current = runSimulation(snapshotFromState(state), now).snapshot;
    const tile = current.tiles.find((candidate) => candidate.x === x && candidate.y === y);
    if (!tile || !tile.buildingId) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "No building to bulldoze on this tile.");
      return;
    }

    const bulldozedSnapshot: GameStateSnapshot = {
      ...current,
      tiles: current.tiles.map((candidate) =>
        candidate.x === x && candidate.y === y
          ? {
              ...candidate,
              buildingId: null,
              constructed: false,
              isActive: true,
              inactiveReason: null,
              constructionStartedAt: null,
              constructionCompleteAt: null,
              lastProducedAt: null
            }
          : candidate
      ),
      lastSimulatedAt: now
    };

    const simulated = runSimulation(bulldozedSnapshot, now).snapshot;
    set({ ...simulated, inspectedTile: { x, y } });
    persist(simulated);
    get().pushToast("success", "Building bulldozed.");
  },

  upgradeTile: (x, y) => {
    const state = get();
    const current = runSimulation(snapshotFromState(state), Date.now()).snapshot;
    const tile = current.tiles.find((candidate) => candidate.x === x && candidate.y === y);
    if (!tile || !tile.constructed || !tile.buildingId) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "Only completed buildings can be upgraded.");
      return;
    }

    const definition = BUILDINGS[tile.buildingId];
    if (!definition.upgradeTo || !definition.upgradeCriteria || !definition.upgradeCost) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "This building has no upgrade path.");
      return;
    }
    const upgradeTo = definition.upgradeTo;

    const criteriaMet =
      tile.landValue >= definition.upgradeCriteria.minLandValue &&
      tile.happiness >= definition.upgradeCriteria.minHappiness;
    if (!criteriaMet || !canAffordCost(current, definition.upgradeCost)) {
      set({ ...current });
      persist(current);
      get().pushToast("warning", "Upgrade blocked by conditions or resources.");
      return;
    }

    const afterCost = deductCost(current, definition.upgradeCost);
    const nextSnapshot: GameStateSnapshot = {
      ...afterCost,
      tiles: afterCost.tiles.map((candidate) =>
        candidate.x === x && candidate.y === y
          ? {
              ...candidate,
              buildingId: upgradeTo
            }
          : candidate
      ),
      lastSimulatedAt: Date.now()
    };

    set({ ...nextSnapshot });
    persist(nextSnapshot);
    get().pushToast("success", `${definition.name} upgraded to ${BUILDINGS[upgradeTo].name}.`);
  },

  inspectTile: (x, y) => {
    set({ inspectedTile: { x, y } });
  },

  closeTileInspector: () => {
    set({ inspectedTile: null });
  },

  simulateNow: () => {
    const state = get();
    const snapshot = snapshotFromState(state);
    const simulated = runSimulation(snapshot, Date.now()).snapshot;
    set({
      ...simulated
    });
    persist(simulated);
    const completedTiles = getConstructedCompletions(snapshot.tiles, simulated.tiles).slice(0, 3);
    for (const tile of completedTiles) {
      const buildingName = tile.buildingId ? BUILDINGS[tile.buildingId].name : "Building";
      get().pushToast("success", `${buildingName} construction complete.`);
    }
  },

  setNextAutoSimAt: (timestamp) => {
    set({ nextAutoSimAt: timestamp });
  },

  pushToast: (type, message, durationMs = 2600) => {
    set((state) => ({
      toasts: (() => {
        const now = Date.now();
        const existingIndex = state.toasts.findIndex(
          (toast) => toast.type === type && toast.message === message && now - toast.createdAt < 1200
        );
        if (existingIndex >= 0) {
          const updated = [...state.toasts];
          updated[existingIndex] = {
            ...updated[existingIndex],
            createdAt: now,
            durationMs
          };
          return updated.slice(-5);
        }
        return [
          ...state.toasts,
          {
            id: `${now}-${Math.random().toString(16).slice(2, 8)}`,
            type,
            message,
            createdAt: now,
            durationMs
          }
        ].slice(-5);
      })()
    }));
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  giftResource: (resource, amount) => {
    const state = get();
    const simulated = runSimulation(snapshotFromState(state), Date.now()).snapshot;

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
