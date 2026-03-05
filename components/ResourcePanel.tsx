import { useGameStore } from "@/game/state/useGameStore";

export const ResourcePanel = () => {
  const resources = useGameStore((state) => state.resources);
  const simulateNow = useGameStore((state) => state.simulateNow);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Resources</h2>
        <button
          type="button"
          onClick={simulateNow}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
        >
          Simulate now
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded bg-slate-800 p-2">Coins: {resources.coins}</div>
        <div className="rounded bg-slate-800 p-2">Energy: {resources.energy}</div>
      </div>
    </section>
  );
};
