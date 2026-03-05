import { useEffect, useState } from "react";

import { BUILDINGS } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";

const toRelativeTime = (timestamp: number): string => {
  const diffSeconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  return `${diffSeconds}s`;
};

const roadStyle = (roadType: "road" | "heavyRoad" | "highway"): { className: string; icon: string } => {
  if (roadType === "heavyRoad") {
    return { className: "bg-slate-500 hover:bg-slate-400", icon: "🛤️" };
  }
  if (roadType === "highway") {
    return { className: "bg-neutral-500 hover:bg-neutral-400", icon: "🛣" };
  }
  return { className: "bg-slate-600 hover:bg-slate-500", icon: "🛣️" };
};

type OverlayMode =
  | "none"
  | "landValue"
  | "pollution"
  | "happiness"
  | "serviceEducation"
  | "serviceRecreation"
  | "serviceCombined";

export const CityGrid = () => {
  const tiles = useGameStore((state) => state.tiles);
  const width = useGameStore((state) => state.gridWidth);
  const selectedBuildingId = useGameStore((state) => state.selectedBuildingId);
  const selectedRoadType = useGameStore((state) => state.selectedRoadType);
  const movingBuilding = useGameStore((state) => state.movingBuilding);
  const resources = useGameStore((state) => state.resources);
  const placeBuilding = useGameStore((state) => state.placeBuilding);
  const placeMovedBuilding = useGameStore((state) => state.placeMovedBuilding);
  const toggleRoad = useGameStore((state) => state.toggleRoad);
  const inspectTile = useGameStore((state) => state.inspectTile);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      if (!["l", "p", "h", "s"].includes(key)) {
        return;
      }
      event.preventDefault();
      setOverlayMode((previous) => {
        if (key === "l") {
          return previous === "landValue" ? "none" : "landValue";
        }
        if (key === "p") {
          return previous === "pollution" ? "none" : "pollution";
        }
        if (key === "h") {
          return previous === "happiness" ? "none" : "happiness";
        }
        if (
          previous !== "serviceEducation" &&
          previous !== "serviceRecreation" &&
          previous !== "serviceCombined"
        ) {
          return "serviceEducation";
        }
        if (previous === "serviceEducation") {
          return "serviceRecreation";
        }
        if (previous === "serviceRecreation") {
          return "serviceCombined";
        }
        return "none";
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const getMovePreview = (x: number, y: number): { isSource: boolean; canPlace: boolean } | null => {
    if (!movingBuilding) {
      return null;
    }
    const tile = tiles.find((candidate) => candidate.x === x && candidate.y === y);
    if (!tile) {
      return null;
    }
    const isSource = movingBuilding.fromX === x && movingBuilding.fromY === y;
    const canPlace = !isSource && tile.buildingId === null && tile.roadType === "none";
    return { isSource, canPlace };
  };

  const canAffordSelectedBuilding = (() => {
    if (!selectedBuildingId) {
      return false;
    }
    const cost = BUILDINGS[selectedBuildingId].cost;
    return Object.entries(cost).every(
      ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
    );
  })();

  const hasAdjacentRoad = (x: number, y: number): boolean => {
    const neighbors = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y]
    ];
    return neighbors.some(([nx, ny]) => tiles.some((tile) => tile.x === nx && tile.y === ny && tile.roadType !== "none"));
  };

  const getBuildPreview = (
    tile: (typeof tiles)[number]
  ): { canPlace: boolean; reason: string | null } | null => {
    if (!selectedBuildingId || selectedRoadType || movingBuilding) {
      return null;
    }
    if (tile.buildingId !== null) {
      return { canPlace: false, reason: "Blocked: tile already has a building." };
    }
    if (tile.roadType !== "none") {
      return { canPlace: false, reason: "Blocked: remove road first." };
    }
    if (!hasAdjacentRoad(tile.x, tile.y)) {
      return { canPlace: false, reason: "Blocked: requires adjacent road." };
    }
    if (!canAffordSelectedBuilding) {
      return { canPlace: false, reason: "Blocked: insufficient resources." };
    }
    return { canPlace: true, reason: "Valid placement." };
  };

  const getServiceOverlayOpacity = (tile: (typeof tiles)[number]): { education: number; recreation: number } => {
    if (overlayMode === "serviceEducation") {
      return { education: tile.serviceCoverage.education ? 0.78 : 0, recreation: 0 };
    }
    if (overlayMode === "serviceRecreation") {
      return { education: 0, recreation: tile.serviceCoverage.recreation ? 0.78 : 0 };
    }
    if (overlayMode === "serviceCombined") {
      return {
        education: tile.serviceCoverage.education ? 0.58 : 0,
        recreation: tile.serviceCoverage.recreation ? 0.58 : 0
      };
    }
    return { education: 0, recreation: 0 };
  };

  const getSingleOverlayStyle = (tile: (typeof tiles)[number]): { background: string; opacity: number } | null => {
    if (overlayMode === "landValue") {
      const hue = Math.round((tile.landValue / 100) * 120);
      return {
        background: `linear-gradient(135deg, hsla(${hue}, 85%, 55%, 0.95), hsla(${hue}, 85%, 35%, 0.9))`,
        opacity: 0.78
      };
    }
    if (overlayMode === "pollution") {
      const intensity = Math.max(0, Math.min(tile.pollution / 80, 1));
      return {
        background: "linear-gradient(135deg, rgba(251,113,133,0.95), rgba(127,29,29,0.95))",
        opacity: 0.2 + intensity * 0.75
      };
    }
    if (overlayMode === "happiness") {
      const hue = Math.round((tile.happiness / 100) * 120);
      return {
        background: `linear-gradient(135deg, hsla(${hue}, 90%, 55%, 0.95), hsla(${hue}, 90%, 32%, 0.9))`,
        opacity: 0.76
      };
    }
    return null;
  };

  const onTileClick = (x: number, y: number): void => {
    if (movingBuilding) {
      placeMovedBuilding(x, y);
      return;
    }

    if (selectedRoadType) {
      toggleRoad(x, y);
      return;
    }

    if (selectedBuildingId) {
      placeBuilding(x, y);
      return;
    }
    inspectTile(x, y);
  };

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">City Grid</h2>
      {movingBuilding ? (
        <p className="mb-3 rounded bg-amber-900/30 px-2 py-1 text-xs text-amber-200">
          Move mode: select a destination tile for {BUILDINGS[movingBuilding.buildingId].name}
        </p>
      ) : null}
      <p className="mb-3 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
        Overlay Mode:{" "}
        {overlayMode === "none"
          ? "Off"
          : overlayMode === "landValue"
            ? "Land Value"
            : overlayMode === "pollution"
              ? "Pollution"
              : overlayMode === "happiness"
                ? "Happiness"
                : overlayMode === "serviceEducation"
                  ? "Service: Education"
                  : overlayMode === "serviceRecreation"
                    ? "Service: Recreation"
                    : "Service: Combined"}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
        <span className="font-medium text-slate-200">Legend:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-cyan-400" />
          Education coverage
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-lime-400" />
          Recreation coverage
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-emerald-400/80" />
          Valid move tile
        </span>
        <span className="text-slate-400">Hotkeys: L land, P pollution, H happiness, S service</span>
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
        }}
      >
        {tiles.map((tile) => {
          const movePreview = getMovePreview(tile.x, tile.y);
          const buildPreview = getBuildPreview(tile);
          const serviceOverlay = getServiceOverlayOpacity(tile);
          const singleOverlay = getSingleOverlayStyle(tile);
          if (!tile.buildingId) {
            if (tile.roadType !== "none") {
              const style = roadStyle(tile.roadType);
              return (
                <button
                  key={`${tile.x}-${tile.y}`}
                  type="button"
                  onClick={() => onTileClick(tile.x, tile.y)}
                  className={`relative aspect-square rounded border border-slate-700 text-xs text-slate-100 ${
                    buildPreview ? (buildPreview.canPlace ? "cursor-copy" : "cursor-not-allowed") : ""
                  } ${style.className}`}
                  title={buildPreview?.reason ?? undefined}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded"
                    style={{
                      opacity: serviceOverlay.education,
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(103,232,249,0.95), rgba(8,145,178,0.8))"
                    }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded"
                    style={{
                      opacity: serviceOverlay.recreation,
                      background:
                        "radial-gradient(circle at 70% 30%, rgba(163,230,53,0.95), rgba(77,124,15,0.8))"
                    }}
                  />
                  {singleOverlay ? (
                    <span
                      className="pointer-events-none absolute inset-0 rounded"
                      style={{ background: singleOverlay.background, opacity: singleOverlay.opacity }}
                    />
                  ) : null}
                  {movePreview ? (
                    <span
                      className={`pointer-events-none absolute inset-0 rounded ${
                        movePreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/45"
                      }`}
                    />
                  ) : null}
                  {buildPreview ? (
                    <span
                      className={`pointer-events-none absolute inset-0 rounded ${
                        buildPreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/55"
                      }`}
                    />
                  ) : null}
                  <span className="relative z-10 text-base">{style.icon}</span>
                </button>
              );
            }
            return (
              <button
                key={`${tile.x}-${tile.y}`}
                type="button"
                onClick={() => onTileClick(tile.x, tile.y)}
                className={`relative aspect-square rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 ${
                  buildPreview ? (buildPreview.canPlace ? "cursor-copy" : "cursor-not-allowed") : ""
                }`}
                title={buildPreview?.reason ?? undefined}
              >
                <span
                  className="pointer-events-none absolute inset-0 rounded"
                  style={{
                    opacity: serviceOverlay.education,
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(103,232,249,0.95), rgba(8,145,178,0.8))"
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded"
                  style={{
                    opacity: serviceOverlay.recreation,
                    background:
                      "radial-gradient(circle at 70% 30%, rgba(163,230,53,0.95), rgba(77,124,15,0.8))"
                  }}
                />
                {singleOverlay ? (
                  <span
                    className="pointer-events-none absolute inset-0 rounded"
                    style={{ background: singleOverlay.background, opacity: singleOverlay.opacity }}
                  />
                ) : null}
                {movePreview ? (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded ${
                      movePreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/45"
                    }`}
                  />
                ) : null}
                {buildPreview ? (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded ${
                      buildPreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/55"
                    }`}
                  />
                ) : null}
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-red-500"
                  style={{ opacity: Math.min(tile.pollution / 120, 0.5) }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-green-400"
                  style={{ opacity: tile.landValue > 50 ? Math.min((tile.landValue - 50) / 100, 0.3) : 0 }}
                />
                +
              </button>
            );
          }

          const building = BUILDINGS[tile.buildingId];
          return (
            <button
              key={`${tile.x}-${tile.y}`}
              type="button"
                onClick={() => onTileClick(tile.x, tile.y)}
                className={`relative aspect-square rounded border border-slate-700 text-center text-xs ${
                  buildPreview ? "cursor-not-allowed" : ""
                } ${building.colorClass}`}
                title={buildPreview?.reason ?? undefined}
            >
                <span
                  className="pointer-events-none absolute inset-0 rounded"
                  style={{
                    opacity: serviceOverlay.education,
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(103,232,249,0.95), rgba(8,145,178,0.8))"
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded"
                  style={{
                    opacity: serviceOverlay.recreation,
                    background:
                      "radial-gradient(circle at 70% 30%, rgba(163,230,53,0.95), rgba(77,124,15,0.8))"
                  }}
                />
                {singleOverlay ? (
                  <span
                    className="pointer-events-none absolute inset-0 rounded"
                    style={{ background: singleOverlay.background, opacity: singleOverlay.opacity }}
                  />
                ) : null}
                {movePreview ? (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded ${
                      movePreview.isSource ? "bg-amber-500/45" : "bg-rose-500/45"
                    }`}
                  />
                ) : null}
                {buildPreview ? (
                  <span className="pointer-events-none absolute inset-0 rounded bg-rose-500/55" />
                ) : null}
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-red-500"
                  style={{ opacity: Math.min(tile.pollution / 120, 0.45) }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-green-400"
                  style={{ opacity: tile.landValue > 50 ? Math.min((tile.landValue - 50) / 100, 0.25) : 0 }}
                />
                <div className="relative z-10">
                  {tile.constructed && !tile.isActive ? (
                    <div className="absolute -top-2 right-0 text-sm" title={tile.inactiveReason ?? "Inactive"}>
                      ⚠️
                    </div>
                  ) : null}
                  <div className="text-xl">{building.emoji}</div>
                  {tile.constructed ? (
                    <div className="text-[10px] text-slate-100">{building.name}</div>
                  ) : (
                    <div className="text-[10px] text-amber-100">
                      Building {tile.constructionCompleteAt ? toRelativeTime(tile.constructionCompleteAt) : ""}
                    </div>
                  )}
                </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
