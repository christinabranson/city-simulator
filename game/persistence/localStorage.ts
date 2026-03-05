import type { GameStateSnapshot } from "@/types/game";

const STORAGE_KEY = "city-sim-mvp-v1";

export const loadSnapshot = (): GameStateSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as GameStateSnapshot;
  } catch {
    return null;
  }
};

export const saveSnapshot = (snapshot: GameStateSnapshot): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
};
