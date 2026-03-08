import { useMemo, useState } from "react";

import { BUILDING_LIST } from "@/game/models/buildings";
import { ROAD_COSTS } from "@/game/models/pricing";
import { useGameStore } from "@/game/state/useGameStore";

type BuildTab = "utility" | "residential" | "commercial" | "industry";

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
            </button>
          );
        })}
      </div>
    </section>
  );
};
