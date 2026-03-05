import { useMemo } from "react";

import { useGameStore } from "@/game/state/useGameStore";
import type { DemandType } from "@/types/game";

const demandLabel = (value: number): "LOW" | "MED" | "HIGH" => {
  if (value >= 30) {
    return "HIGH";
  }
  if (value <= -30) {
    return "LOW";
  }
  return "MED";
};

const demandArrow = (value: number): string => {
  if (value >= 15) {
    return "↑";
  }
  if (value <= -15) {
    return "↓";
  }
  return "→";
};

const demandMeta: Record<DemandType, { icon: string; label: string }> = {
  residential: { icon: "🏠", label: "Residential" },
  commercial: { icon: "🏪", label: "Commercial" },
  industrial: { icon: "🏭", label: "Industrial" }
};

export const DemandPanel = () => {
  const demand = useGameStore((state) => state.cityMetrics.demand);

  const entries = useMemo(
    () =>
      (Object.keys(demandMeta) as DemandType[]).map((type) => ({
        type,
        score: demand[type],
        label: demandLabel(demand[type]),
        arrow: demandArrow(demand[type])
      })),
    [demand]
  );

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">City Demand</h2>
      <ul className="space-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.type} className="flex items-center justify-between rounded bg-slate-800 px-2 py-2">
            <span>
              {demandMeta[entry.type].icon} {demandMeta[entry.type].label}
            </span>
            <span className="font-medium">
              {entry.arrow} {entry.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
