import { useMemo } from "react";

import { BUILDINGS } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";
import type { BuildingId } from "@/types/game";

const msToSeconds = (timestamp: number): number =>
  Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));

export const ConstructionQueuePanel = () => {
  const tiles = useGameStore((state) => state.tiles);
  const queue = useMemo(
    () =>
      tiles
        .filter((tile) => tile.buildingId && !tile.constructed && tile.constructionCompleteAt)
        .map((tile) => ({
          tileKey: `${tile.x}-${tile.y}`,
          x: tile.x,
          y: tile.y,
          buildingName: BUILDINGS[tile.buildingId as BuildingId].name,
          readyAt: tile.constructionCompleteAt as number
        }))
        .sort((a, b) => a.readyAt - b.readyAt),
    [tiles]
  );

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
        Construction Queue
      </h2>
      {queue.length === 0 ? (
        <p className="text-sm text-slate-400">No active construction.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {queue.map((item) => (
            <li key={item.tileKey} className="rounded bg-slate-800 p-2">
              {item.buildingName} at ({item.x}, {item.y}) - ready in {msToSeconds(item.readyAt)}s
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
