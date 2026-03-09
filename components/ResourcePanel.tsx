import { useEffect, useMemo, useState } from "react";

import { getLandExpansionCost, LAND_EXPANSION } from "@/game/models/pricing";
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

const cooldownTimeUntil = (timestamp: number | null, now: number): string => {
  if (!timestamp || timestamp <= now) {
    return "Ready";
  }
  const diff = Math.max(0, Math.ceil((timestamp - now) / 1000));
  return `${diff}s`;
};

const resourceLabel: Record<ResourceType, string> = {
  coins: "Coins",
  energy: "Energy",
  water: "Water"
};

const resourceIcon: Record<ResourceType, string> = {
  coins: "🪙",
  energy: "⚡",
  water: "💧"
};

export const ResourcePanel = () => {
  const resources = useGameStore((state) => state.resources);
  const tiles = useGameStore((state) => state.tiles);
  const lastSimulatedAt = useGameStore((state) => state.lastSimulatedAt);
  const nextAutoSimAt = useGameStore((state) => state.nextAutoSimAt);
  const cityMetrics = useGameStore((state) => state.cityMetrics);
  const simulateNow = useGameStore((state) => state.simulateNow);
  const expandLand = useGameStore((state) => state.expandLand);
  const surveyLandExpansion = useGameStore((state) => state.surveyLandExpansion);
  const clearLandSurvey = useGameStore((state) => state.clearLandSurvey);
  const plannedExpansion = useGameStore((state) => state.plannedExpansion);
  const nextLandSurveyAt = useGameStore((state) => state.nextLandSurveyAt);
  const gridWidth = useGameStore((state) => state.gridWidth);
  const gridHeight = useGameStore((state) => state.gridHeight);
  const [now, setNow] = useState(() => Date.now());
  const expansionCost = useMemo(() => getLandExpansionCost(gridWidth, gridHeight), [gridWidth, gridHeight]);

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
  const surveyCooldownActive = Boolean(nextLandSurveyAt && nextLandSurveyAt > now);
  const canAffordResurvey = Object.entries(LAND_EXPANSION.resurveyCost).every(
    ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
  );
  const surveyBlocked = surveyCooldownActive || (plannedExpansion ? !canAffordResurvey : false);

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
          <button
            type="button"
            onClick={expandLand}
            className="mt-2 rounded bg-indigo-700 px-2 py-1 text-[11px] text-indigo-50 hover:bg-indigo-600"
          >
            Buy land (+2x2) [{Object.entries(expansionCost)
              .map(([resource, amount]) => `${resource}:${amount}`)
              .join(" ")}]
          </button>
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={surveyLandExpansion}
              disabled={surveyBlocked}
              className="rounded bg-sky-700 px-2 py-1 text-[11px] text-sky-50 enabled:hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {plannedExpansion ? "Resurvey" : "Survey"}
            </button>
            {plannedExpansion ? (
              <button
                type="button"
                onClick={clearLandSurvey}
                className="rounded bg-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-600"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="mt-1 text-[11px] text-slate-300">
            Survey cooldown: {cooldownTimeUntil(nextLandSurveyAt, now)}
            {plannedExpansion
              ? ` | Resurvey cost: ${Object.entries(LAND_EXPANSION.resurveyCost)
                  .map(([resource, amount]) => `${resource}:${amount}`)
                  .join(" ")}`
              : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {(["coins", "energy", "water"] as const).map((resource) => (
          <div key={resource} className="rounded bg-slate-800 p-2">
            <div className="font-medium">
              {resourceIcon[resource]} {resourceLabel[resource]}: {resources[resource]}
            </div>
            <div
              className={`mt-1 text-xs ${
                cycleStats[resource].totalPerCycle > 0 ? "text-emerald-300" : "text-slate-300"
              }`}
            >
              +{cycleStats[resource].totalPerCycle} per cycle
            </div>
            <div className="text-xs text-slate-300">
              Next cycle completes in: {timeUntil(cycleStats[resource].nextCompletionAt, now)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded bg-slate-800 p-2 text-xs text-slate-200">
        Population: {cityMetrics.population} | Jobs: {cityMetrics.jobs} | Unemployment:{" "}
        {(cityMetrics.unemploymentRate * 100).toFixed(0)}% | Avg Happiness: {cityMetrics.averageHappiness} |
        Avg Land Value: {cityMetrics.averageLandValue} | Stage: {cityMetrics.progressionStage}
      </div>
      <div className="mt-2 rounded bg-slate-800 p-2 text-xs text-slate-300">
        Land Tiers - Slum: {cityMetrics.landValueTierCounts.slum} | Basic:{" "}
        {cityMetrics.landValueTierCounts.basic} | Suburban: {cityMetrics.landValueTierCounts.suburban} |
        High Value: {cityMetrics.landValueTierCounts.highValue}
      </div>
      <div className="mt-2 rounded bg-slate-800 p-2 text-xs text-slate-300">
        Service Coverage - School: {cityMetrics.serviceCoverageCounts.education} tiles | Park:{" "}
        {cityMetrics.serviceCoverageCounts.recreation} tiles
      </div>
      {plannedExpansion ? (
        <div className="mt-2 rounded bg-sky-900/30 p-2 text-xs text-sky-200">
          Survey ready: +{plannedExpansion.tiles.length} tiles, lakes:{" "}
          {plannedExpansion.tiles.filter((tile) => tile.landmark === "lake").length}
        </div>
      ) : null}
    </section>
  );
};
