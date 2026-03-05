import { BUILDINGS } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";

const toRelativeTime = (timestamp: number): string => {
  const diffSeconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  return `${diffSeconds}s`;
};

export const CityGrid = () => {
  const tiles = useGameStore((state) => state.tiles);
  const width = useGameStore((state) => state.gridWidth);
  const selectedBuildingId = useGameStore((state) => state.selectedBuildingId);
  const selectedRoadType = useGameStore((state) => state.selectedRoadType);
  const movingBuilding = useGameStore((state) => state.movingBuilding);
  const placeBuilding = useGameStore((state) => state.placeBuilding);
  const placeMovedBuilding = useGameStore((state) => state.placeMovedBuilding);
  const toggleRoad = useGameStore((state) => state.toggleRoad);
  const inspectTile = useGameStore((state) => state.inspectTile);

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
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
        }}
      >
        {tiles.map((tile) => {
          const movePreview = getMovePreview(tile.x, tile.y);
          if (!tile.buildingId) {
            if (tile.roadType !== "none") {
              return (
                <button
                  key={`${tile.x}-${tile.y}`}
                  type="button"
                  onClick={() => onTileClick(tile.x, tile.y)}
                  className="relative aspect-square rounded border border-slate-700 bg-slate-600 text-xs text-slate-100 hover:bg-slate-500"
                >
                  {movePreview ? (
                    <span
                      className={`pointer-events-none absolute inset-0 rounded ${
                        movePreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/45"
                      }`}
                    />
                  ) : null}
                  <span className="relative z-10 text-base">🛣️</span>
                </button>
              );
            }
            return (
              <button
                key={`${tile.x}-${tile.y}`}
                type="button"
                onClick={() => onTileClick(tile.x, tile.y)}
                className="relative aspect-square rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                {movePreview ? (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded ${
                      movePreview.canPlace ? "bg-emerald-500/45" : "bg-rose-500/45"
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
                className={`relative aspect-square rounded border border-slate-700 text-center text-xs ${building.colorClass}`}
            >
                {movePreview ? (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded ${
                      movePreview.isSource ? "bg-amber-500/45" : "bg-rose-500/45"
                    }`}
                  />
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
