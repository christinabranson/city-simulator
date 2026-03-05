import { BUILDINGS } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";

const stat = (value: number): string => value.toFixed(1);

export const TileInspectorModal = () => {
  const inspectedTile = useGameStore((state) => state.inspectedTile);
  const tiles = useGameStore((state) => state.tiles);
  const demand = useGameStore((state) => state.cityMetrics.demand);
  const closeTileInspector = useGameStore((state) => state.closeTileInspector);

  if (!inspectedTile) {
    return null;
  }

  const tile = tiles.find((candidate) => candidate.x === inspectedTile.x && candidate.y === inspectedTile.y);
  if (!tile) {
    return null;
  }

  const building = tile.buildingId ? BUILDINGS[tile.buildingId] : null;
  const isConstructing = Boolean(tile.buildingId && !tile.constructed);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Tile Inspector</h3>
          <button
            type="button"
            onClick={closeTileInspector}
            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-200">
          <p>
            Coordinates: ({tile.x}, {tile.y})
          </p>
          <p>Building: {building ? `${building.emoji} ${building.name}` : "Empty"}</p>
          <p>Category: {building?.category ?? "N/A"}</p>
          <p>Status: {isConstructing ? "Under construction" : building ? "Active" : "Empty tile"}</p>
        </div>

        <div className="mt-4 rounded bg-slate-800 p-3 text-sm text-slate-200">
          <p>Land Value: {stat(tile.landValue)}</p>
          <p>Pollution: {stat(tile.pollution)}</p>
          <p>Happiness: {stat(tile.happiness)}</p>
        </div>

        {building ? (
          <div className="mt-4 space-y-1 text-sm text-slate-200">
            {building.category === "residential" ? (
              <p>Population Capacity: {building.population ?? 0}</p>
            ) : null}
            {building.category === "commercial" || building.category === "industrial" ? (
              <p>Jobs: {building.jobs ?? 0}</p>
            ) : null}
            {building.category === "industrial" ? (
              <p>Pollution Generated: {building.pollution ?? 0}</p>
            ) : null}
            {building.category === "recreation" ? (
              <p>Land Value Bonus: {building.landValueBonus ?? 0}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 rounded bg-slate-800 p-3 text-xs text-slate-300">
          <p className="mb-1 font-medium text-slate-200">Demand context</p>
          {demand.residential >= 30 ? <p>- Housing shortage: residential demand is high.</p> : null}
          {demand.commercial >= 30 || demand.industrial >= 30 ? (
            <p>- Job shortage: commercial/industrial demand is rising.</p>
          ) : null}
          {demand.residential <= -30 && demand.commercial <= -30 && demand.industrial <= -30 ? (
            <p>- City growth is currently stable.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
