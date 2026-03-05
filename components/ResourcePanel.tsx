import { useEffect, useMemo, useState } from "react";

import { getResourceCycleStats } from "@/game/simulation/metrics";
import { useGameStore } from "@/game/state/useGameStore";
import type { ResourceType } from "@/types/game";

const timeUntil = (timestamp: number | null, now: number): string => {
  if (!timestamp) {
    return "No producers";
  }
  const diff = Math.max(0, Math.ceil((timestamp - now) / 1000));
  return diff === 0 ? "Ready to collect" : `${diff}s`;
};

const autoRefreshTimeUntil = (timestamp: number | null, now: number): string => {
  if (!timestamp) {
    return "Starting...";
  }
  const diff = Math.max(0, Math.ceil((timestamp - now) / 1000));
  return `${diff}s`;
};

const resourceLabel: Record<ResourceType, string> = {
  coins: "Coins",
  energy: "Energy"
};

export const ResourcePanel = () => {
  const resources = useGameStore((state) => state.resources);
  const tiles = useGameStore((state) => state.tiles);
  const lastSimulatedAt = useGameStore((state) => state.lastSimulatedAt);
  const nextAutoSimAt = useGameStore((state) => state.nextAutoSimAt);
  const simulateNow = useGameStore((state) => state.simulateNow);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const cycleStats = useMemo(
    () =>
      getResourceCycleStats(
        {
          tiles,
          lastSimulatedAt
        },
        now
      ),
    [tiles, lastSimulatedAt, now]
  );

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Resources</h2>
        <div className="text-right">
          <button
            type="button"
            onClick={simulateNow}
            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
          >
            Simulate now
          </button>
          <div className="mt-1 text-[11px] text-slate-300">
            Next auto refresh: {autoRefreshTimeUntil(nextAutoSimAt, now)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {(["coins", "energy"] as const).map((resource) => (
          <div key={resource} className="rounded bg-slate-800 p-2">
            <div className="font-medium">
              {resourceLabel[resource]}: {resources[resource]}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              +{cycleStats[resource].totalPerCycle} per cycle
            </div>
            <div className="text-xs text-slate-300">
              Next cycle completes in: {timeUntil(cycleStats[resource].nextCompletionAt, now)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
