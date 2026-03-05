import { BUILDING_LIST } from "@/game/models/buildings";
import { useGameStore } from "@/game/state/useGameStore";

export const BuildingPalette = () => {
  const selectedBuildingId = useGameStore((state) => state.selectedBuildingId);
  const selectedRoadType = useGameStore((state) => state.selectedRoadType);
  const selectBuilding = useGameStore((state) => state.selectBuilding);
  const selectRoadTool = useGameStore((state) => state.selectRoadTool);
  const resources = useGameStore((state) => state.resources);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Build</h2>
      <div className="space-y-2">
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
        <button
          type="button"
          onClick={() => selectRoadTool("road")}
          className={`w-full rounded border px-3 py-2 text-left text-sm ${
            selectedRoadType === "road"
              ? "border-sky-500 bg-sky-900/30"
              : "border-slate-700 bg-slate-800 hover:bg-slate-700"
          }`}
        >
          🛣️ Road tool
        </button>
        {BUILDING_LIST.map((building) => {
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
