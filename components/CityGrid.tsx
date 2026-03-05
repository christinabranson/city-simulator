import { BUILDINGS } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";

const toRelativeTime = (timestamp: number): string => {
  const diffSeconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  return `${diffSeconds}s`;
};

export const CityGrid = () => {
  const tiles = useGameStore((state) => state.tiles);
  const width = useGameStore((state) => state.gridWidth);
  const placeBuilding = useGameStore((state) => state.placeBuilding);

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
                onClick={() => placeBuilding(tile.x, tile.y)}
                className="aspect-square rounded border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                +
              </button>
            );
          }

          const building = BUILDINGS[tile.buildingId];
          return (
            <button
              key={`${tile.x}-${tile.y}`}
              type="button"
              onClick={() => placeBuilding(tile.x, tile.y)}
              className={`aspect-square rounded border border-slate-700 text-center text-xs ${building.colorClass}`}
            >
              <div className="text-xl">{building.emoji}</div>
              {tile.constructed ? (
                <div className="text-[10px] text-slate-100">{building.name}</div>
              ) : (
                <div className="text-[10px] text-amber-100">
                  Building {tile.constructionCompleteAt ? toRelativeTime(tile.constructionCompleteAt) : ""}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
