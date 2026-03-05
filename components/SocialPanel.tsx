import { MOCK_CITIES } from "@/game/models/mockCities";
import { useGameStore } from "@/game/state/useGameStore";

export const SocialPanel = () => {
  const giftResource = useGameStore((state) => state.giftResource);
  const gifts = useGameStore((state) => state.gifts);
  const activeNeighborCityId = useGameStore((state) => state.activeNeighborCityId);
  const visitNeighborCity = useGameStore((state) => state.visitNeighborCity);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
        Social Hooks (Stub)
      </h2>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {MOCK_CITIES.map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => visitNeighborCity(city.id)}
            className={`rounded border px-2 py-1 ${
              activeNeighborCityId === city.id
                ? "border-sky-500 bg-sky-900/30"
                : "border-slate-700 bg-slate-800"
            }`}
          >
            Visit {city.name}
          </button>
        ))}
      </div>
      <div className="mb-3 space-x-2 text-sm">
        <button
          type="button"
          onClick={() => giftResource("coins", 5)}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
        >
          Gift 5 coins
        </button>
        <button
          type="button"
          onClick={() => giftResource("energy", 1)}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
        >
          Gift 1 energy
        </button>
      </div>
      <div className="text-xs text-slate-300">
        <p className="mb-1">Recent gift events:</p>
        {gifts.length === 0 ? (
          <p className="text-slate-400">No gifts sent yet.</p>
        ) : (
          <ul className="space-y-1">
            {gifts.slice(0, 5).map((gift) => (
              <li key={gift.id}>
                Sent {gift.amount} {gift.resource} at {new Date(gift.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
