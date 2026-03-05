import { useEffect } from "react";

import { useGameStore } from "@/game/state/useGameStore";

export const useHydratedGame = (): void => {
  const hydrate = useGameStore((state) => state.hydrateFromStorage);
  const simulateNow = useGameStore((state) => state.simulateNow);
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
};
