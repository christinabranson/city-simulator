import { useMemo, useState } from "react";

import { BUILDING_LIST } from "@/game/models/buildings";
import { ROI_RESOURCE_WEIGHTS, ROI_VALUE_SCORE_WEIGHTS, ROAD_COSTS } from "@/game/models/pricing";
import { useGameStore } from "@/game/state/useGameStore";
import type { BuildingDefinition, ResourceType } from "@/types/game";

type BuildTab = "utility" | "residential" | "commercial" | "industry";
const COMPARABLE_CATEGORIES = new Set(["residential", "commercial", "industrial"]);
const formatSigned = (value: number): string => `${value >= 0 ? "+" : ""}${value}`;

const toCoinEquivalent = (cost: BuildingDefinition["cost"]): number =>
  Object.entries(cost).reduce((sum, [resource, amount]) => {
    return sum + (ROI_RESOURCE_WEIGHTS[resource as ResourceType] ?? 0) * (amount ?? 0);
  }, 0);

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "n/a";
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  return `${(seconds / 60).toFixed(1)}m`;
};

const getCoinPaybackTime = (building: BuildingDefinition): string => {
  if (building.production.resource !== "coins") {
    return "n/a (non-coin producer)";
  }
  const coinCost = building.cost.coins ?? 0;
  const coinsPerSecond = building.production.amountPerCycle / building.production.cycleSeconds;
  if (coinCost <= 0 || coinsPerSecond <= 0) {
    return "n/a";
  }
  return formatTime(coinCost / coinsPerSecond);
};

const getValueScore = (building: BuildingDefinition): number => {
  const costEquivalent = toCoinEquivalent(building.cost);
  if (costEquivalent <= 0) {
    return 0;
  }
  const outputPerMinute =
    ROI_RESOURCE_WEIGHTS[building.production.resource] *
    building.production.amountPerCycle *
    (60 / building.production.cycleSeconds);
  const utilityScore =
    (building.population ?? 0) * ROI_VALUE_SCORE_WEIGHTS.population +
    (building.jobs ?? 0) * ROI_VALUE_SCORE_WEIGHTS.jobs +
    (building.landValueBonus ?? 0) * ROI_VALUE_SCORE_WEIGHTS.landValueBonus +
    (building.serviceProvider ? building.serviceProvider.radius * ROI_VALUE_SCORE_WEIGHTS.serviceRadius : 0);
  const pollutionPenalty = (building.pollution ?? 0) * ROI_VALUE_SCORE_WEIGHTS.pollutionPenalty;
  return Math.round(
    ((outputPerMinute + utilityScore - pollutionPenalty) / costEquivalent) * ROI_VALUE_SCORE_WEIGHTS.scale
  );
};

export const BuildingPalette = () => {
  const selectedBuildingId = useGameStore((state) => state.selectedBuildingId);
  const selectedRoadType = useGameStore((state) => state.selectedRoadType);
  const selectBuilding = useGameStore((state) => state.selectBuilding);
  const selectRoadTool = useGameStore((state) => state.selectRoadTool);
  const resources = useGameStore((state) => state.resources);
  const [activeTab, setActiveTab] = useState<BuildTab>("utility");

  const filteredBuildings = useMemo(
    () =>
      BUILDING_LIST.filter((building) => {
        if (activeTab === "utility") {
          return building.category === "civic" || building.category === "recreation";
        }
        if (activeTab === "residential") {
          return building.category === "residential";
        }
        if (activeTab === "commercial") {
          return building.category === "commercial";
        }
        return building.category === "industrial";
      }),
    [activeTab]
  );
  const categoryBaseline = useMemo(() => {
    const baseline = new Map<string, (typeof BUILDING_LIST)[number]>();
    for (const building of BUILDING_LIST) {
      const current = baseline.get(building.category);
      const currentCoins = current?.cost.coins ?? Number.POSITIVE_INFINITY;
      const nextCoins = building.cost.coins ?? Number.POSITIVE_INFINITY;
      if (!current || nextCoins < currentCoins) {
        baseline.set(building.category, building);
      }
    }
    return baseline;
  }, []);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Build</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "utility", label: "Utility" },
            { id: "residential", label: "Residential" },
            { id: "commercial", label: "Commercial" },
            { id: "industry", label: "Industry" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as BuildTab)}
              className={`rounded border px-2 py-1 text-[11px] ${
                activeTab === tab.id
                  ? "border-sky-500 bg-sky-900/30 text-sky-100"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            selectBuilding(null);
            selectRoadTool(null);
          }}
          className={`w-full rounded border px-3 py-2 text-left text-sm ${
            selectedBuildingId === null && selectedRoadType === null
              ? "border-sky-500 bg-sky-900/30"
              : "border-slate-700 bg-slate-800 hover:bg-slate-700"
          }`}
        >
          Cursor only
        </button>
        {activeTab === "utility" ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "road", label: "Road", icon: "🛣️" },
              { id: "heavyRoad", label: "Heavy", icon: "🛤️" },
              { id: "highway", label: "Highway", icon: "🛣" }
            ].map((road) => {
              const cost = ROAD_COSTS[road.id as "road" | "heavyRoad" | "highway"];
              const affordable = Object.entries(cost).every(
                ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
              );
              return (
                <button
                  key={road.id}
                  type="button"
                  onClick={() => selectRoadTool(road.id as "road" | "heavyRoad" | "highway")}
                  className={`rounded border px-2 py-2 text-center text-xs ${
                    selectedRoadType === road.id
                      ? "border-sky-500 bg-sky-900/30"
                      : "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  <div>{road.icon}</div>
                  <div>{road.label}</div>
                  <div className="text-[10px] text-slate-300">
                    {Object.entries(cost)
                      .map(([resource, amount]) => `${resource}:${amount}`)
                      .join(" ")}
                  </div>
                  {!affordable ? <div className="text-[10px] text-rose-300">Low</div> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        {filteredBuildings.map((building) => {
          const affordable = Object.entries(building.cost).every(
            ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
          );
          const outputPerCycle = `${building.production.amountPerCycle} ${building.production.resource} / ${building.production.cycleSeconds}s`;
          const baseline =
            COMPARABLE_CATEGORIES.has(building.category) ? categoryBaseline.get(building.category) : undefined;
          const showComparison = Boolean(baseline && baseline.id !== building.id);
          const populationDelta = (building.population ?? 0) - (baseline?.population ?? 0);
          const jobsDelta = (building.jobs ?? 0) - (baseline?.jobs ?? 0);
          const productionDelta = building.production.amountPerCycle - (baseline?.production.amountPerCycle ?? 0);
          const payback = getCoinPaybackTime(building);
          const valueScore = getValueScore(building);
          return (
            <button
              key={building.id}
              type="button"
              onClick={() => selectBuilding(building.id)}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                selectedBuildingId === building.id
                  ? "border-sky-500 bg-sky-900/30"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  {building.emoji} {building.name}
                </span>
                {!affordable ? <span className="text-rose-300">Insufficient</span> : null}
              </div>
              <div className="text-xs text-slate-300">
                Cost: {Object.entries(building.cost).map(([resource, amount]) => (
                  <span key={resource} className="mr-2">
                    {resource} {amount}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                Impact: Pop {building.population ?? 0} | Jobs {building.jobs ?? 0} | Output {outputPerCycle}
              </div>
              <div className="mt-1 text-[11px] text-emerald-200">
                ROI: Payback {payback} | Value score {formatSigned(valueScore)}
              </div>
              {showComparison ? (
                <div className="mt-1 text-[11px] text-sky-200">
                  Vs {baseline?.name}: {formatSigned(populationDelta)} pop, {formatSigned(jobsDelta)} jobs,{" "}
                  {formatSigned(productionDelta)} {building.production.resource}/cycle
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
