import { BUILDINGS } from "@/game/models/buildings";
import { getScaledCost } from "@/game/models/costs";
import { MOVE_COST_RATIO } from "@/game/models/economy";
import { getLandValueTier } from "@/game/simulation/landValue";
import { useGameStore } from "@/game/state/useGameStore";

const stat = (value: number): string => value.toFixed(1);
const roadLabel: Record<string, string> = {
  none: "No road",
  road: "Road (base)",
  heavyRoad: "Heavy road (+service reach)",
  highway: "Highway (++service reach)"
};

export const TileInspectorModal = () => {
  const inspectedTile = useGameStore((state) => state.inspectedTile);
  const tiles = useGameStore((state) => state.tiles);
  const resources = useGameStore((state) => state.resources);
  const demand = useGameStore((state) => state.cityMetrics.demand);
  const movingBuilding = useGameStore((state) => state.movingBuilding);
  const beginMoveTile = useGameStore((state) => state.beginMoveTile);
  const cancelMove = useGameStore((state) => state.cancelMove);
  const bulldozeTile = useGameStore((state) => state.bulldozeTile);
  const upgradeTile = useGameStore((state) => state.upgradeTile);
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
  const landTier = getLandValueTier(tile.landValue);
  const upgradeTarget = building?.upgradeTo ? BUILDINGS[building.upgradeTo] : null;
  const upgradeCriteria = building?.upgradeCriteria;
  const upgradeCost = building?.upgradeCost;
  const meetsUpgradeCriteria = Boolean(
    upgradeCriteria &&
      tile.landValue >= upgradeCriteria.minLandValue &&
      tile.happiness >= upgradeCriteria.minHappiness
  );
  const canAffordUpgrade = Boolean(
    upgradeCost &&
      Object.entries(upgradeCost).every(
        ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
      )
  );
  const canUpgradeNow = Boolean(
    tile.constructed &&
      tile.isActive &&
      upgradeTarget &&
      upgradeCriteria &&
      upgradeCost &&
      meetsUpgradeCriteria &&
      canAffordUpgrade
  );
  const moveCost = building ? getScaledCost(building.cost, MOVE_COST_RATIO) : null;
  const canAffordMove = Boolean(
    moveCost &&
      Object.entries(moveCost).every(
        ([resource, amount]) => resources[resource as keyof typeof resources] >= (amount ?? 0)
      )
  );
  const canMoveNow = Boolean(tile.constructed && tile.buildingId && canAffordMove);

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
          <p>Road: {roadLabel[tile.roadType]}</p>
          <p>Category: {building?.category ?? "N/A"}</p>
          <p>
            Status:{" "}
            {isConstructing
              ? "Under construction"
              : building
                ? tile.isActive
                  ? "Active"
                  : "Inactive"
                : "Empty tile"}
          </p>
          {!tile.isActive && tile.inactiveReason ? <p>Issue: {tile.inactiveReason}</p> : null}
        </div>

        <div className="mt-4 rounded bg-slate-800 p-3 text-sm text-slate-200">
          <p>Land Value: {stat(tile.landValue)}</p>
          <p>Land Tier: {landTier}</p>
          <p>Pollution: {stat(tile.pollution)}</p>
          <p>Happiness: {stat(tile.happiness)}</p>
          <p className="mt-2 font-medium">Services</p>
          <p>{tile.serviceCoverage.education ? "✔" : "✘"} School coverage</p>
          <p>{tile.serviceCoverage.recreation ? "✔" : "✘"} Park coverage</p>
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
            {upgradeTarget && upgradeCriteria ? (
              <>
                <p>
                  Upgrade Path: {building.name} → {upgradeTarget.name}
                </p>
                <p>
                  Upgrade Requirements: Land Value {upgradeCriteria.minLandValue}+ and Happiness{" "}
                  {upgradeCriteria.minHappiness}+
                </p>
                <p>
                  Upgrade Cost:{" "}
                  {Object.entries(upgradeCost ?? {}).map(([resource, amount]) => (
                    <span key={resource} className="mr-2">
                      {resource} {amount}
                    </span>
                  ))}
                </p>
                <p>
                  Upgrade Status:{" "}
                  {canUpgradeNow
                    ? "Ready to upgrade"
                    : !tile.isActive
                      ? "Building must be active"
                    : !meetsUpgradeCriteria
                      ? "Blocked by conditions"
                      : "Insufficient resources"}
                </p>
                <button
                  type="button"
                  onClick={() => upgradeTile(tile.x, tile.y)}
                  disabled={!canUpgradeNow}
                  className={`mt-1 rounded px-2 py-1 text-xs ${
                    canUpgradeNow
                      ? "bg-emerald-700 text-emerald-50 hover:bg-emerald-600"
                      : "cursor-not-allowed bg-slate-700 text-slate-300"
                  }`}
                >
                  Upgrade to {upgradeTarget.name}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {building ? (
          <div className="mt-4 rounded bg-slate-800 p-3 text-sm text-slate-200">
            <p className="mb-1 font-medium">Relocation</p>
            <p>
              Move Cost:{" "}
              {Object.entries(moveCost ?? {}).map(([resource, amount]) => (
                <span key={resource} className="mr-2">
                  {resource} {amount}
                </span>
              ))}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => beginMoveTile(tile.x, tile.y)}
                disabled={!canMoveNow}
                className={`rounded px-2 py-1 text-xs ${
                  canMoveNow
                    ? "bg-amber-700 text-amber-50 hover:bg-amber-600"
                    : "cursor-not-allowed bg-slate-700 text-slate-300"
                }`}
              >
                Move building
              </button>
              <button
                type="button"
                onClick={() => bulldozeTile(tile.x, tile.y)}
                className="rounded bg-rose-700 px-2 py-1 text-xs text-rose-50 hover:bg-rose-600"
              >
                Bulldoze
              </button>
            </div>
            {!canAffordMove ? <p className="mt-1 text-xs text-rose-300">Insufficient resources to move.</p> : null}
          </div>
        ) : null}

        {movingBuilding ? (
          <div className="mt-4 rounded bg-amber-900/30 p-3 text-xs text-amber-200">
            Move mode is active. Click destination tile in the grid, or{" "}
            <button type="button" onClick={cancelMove} className="underline">
              cancel move
            </button>
            .
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
