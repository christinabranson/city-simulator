import { useEffect } from "react";

import { useGameStore } from "@/game/state/useGameStore";

export const useHydratedGame = (): void => {
  const hydrate = useGameStore((state) => state.hydrateFromStorage);
  const simulateNow = useGameStore((state) => state.simulateNow);
  const setNextAutoSimAt = useGameStore((state) => state.setNextAutoSimAt);
  const hydrated = useGameStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  useEffect(() => {
    const onFocus = (): void => {
      simulateNow();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [simulateNow]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const scheduleNext = (): void => {
      setNextAutoSimAt(Date.now() + 60_000);
    };
    scheduleNext();

    const interval = window.setInterval(() => {
      simulateNow();
      scheduleNext();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      setNextAutoSimAt(null);
    };
  }, [hydrated, setNextAutoSimAt, simulateNow]);
};
