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
  const placeBuilding = useGameStore((state) => state.placeBuilding);
  const inspectTile = useGameStore((state) => state.inspectTile);

  const onTileClick = (x: number, y: number): void => {
    if (selectedBuildingId) {
      placeBuilding(x, y);
    }
    inspectTile(x, y);
  };

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">City Grid</h2>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
        }}
      >
        {tiles.map((tile) => {
          if (!tile.buildingId) {
            return (
              <button
                key={`${tile.x}-${tile.y}`}
                type="button"
                onClick={() => onTileClick(tile.x, tile.y)}
                className="relative aspect-square rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
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
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-red-500"
                  style={{ opacity: Math.min(tile.pollution / 120, 0.45) }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded bg-green-400"
                  style={{ opacity: tile.landValue > 50 ? Math.min((tile.landValue - 50) / 100, 0.25) : 0 }}
                />
                <div className="relative z-10">
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
