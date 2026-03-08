import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGameStore } from "@/game/state/useGameStore";
import type { GameStateSnapshot } from "@/types/game";

interface CloudCity {
  cityId: string;
  cityName: string;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt: string;
}

const DEFAULT_CITY_ID = "primary";
const DEFAULT_CITY_NAME = "My City";
const ACTIVE_CITY_STORAGE_KEY = "city-sim-active-city-id";
const toCityIdSlug = (name: string): string => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `city-${Math.random().toString(36).slice(2, 8)}`;
};

export const CloudSyncBridge = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const hydrated = useGameStore((state) => state.hydrated);
  const hydrateFromSnapshot = useGameStore((state) => state.hydrateFromSnapshot);
  const pushToast = useGameStore((state) => state.pushToast);
  const gridWidth = useGameStore((state) => state.gridWidth);
  const gridHeight = useGameStore((state) => state.gridHeight);
  const resources = useGameStore((state) => state.resources);
  const tiles = useGameStore((state) => state.tiles);
  const lastSimulatedAt = useGameStore((state) => state.lastSimulatedAt);
  const gifts = useGameStore((state) => state.gifts);
  const cityMetrics = useGameStore((state) => state.cityMetrics);
  const [cities, setCities] = useState<CloudCity[]>([]);
  const [activeCityId, setActiveCityId] = useState(DEFAULT_CITY_ID);
  const [transferToCityId, setTransferToCityId] = useState("");
  const [readyToSync, setReadyToSync] = useState(false);
  const [cloudWriteEnabled, setCloudWriteEnabled] = useState(true);
  const [loadingCity, setLoadingCity] = useState(false);
  const lastSyncedHash = useRef<string | null>(null);
  const cloudBootstrapStarted = useRef(false);

  const localSnapshot = useMemo(
    () => ({
      gridWidth,
      gridHeight,
      resources,
      tiles,
      lastSimulatedAt,
      gifts,
      cityMetrics
    }),
    [cityMetrics, gifts, gridHeight, gridWidth, lastSimulatedAt, resources, tiles]
  );

  const serializedSnapshot = useMemo(() => JSON.stringify(localSnapshot), [localSnapshot]);

  const listCities = useCallback(async (): Promise<CloudCity[]> => {
    const response = await fetch("/api/cloud/cities");
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { cities?: CloudCity[] };
    return payload.cities ?? [];
  }, []);

  const loadCity = useCallback(
    async (cityId: string): Promise<void> => {
      setLoadingCity(true);
      setReadyToSync(false);
      try {
        const response = await fetch(`/api/cloud/snapshot?cityId=${encodeURIComponent(cityId)}`);
        if (!response.ok) {
          setCloudWriteEnabled(false);
          pushToast("warning", "Cloud city load failed.");
          return;
        }
        const payload = (await response.json()) as { snapshot: GameStateSnapshot | null };
        if (payload.snapshot) {
          const cloudHash = JSON.stringify(payload.snapshot);
          lastSyncedHash.current = cloudHash;
          if (cloudHash !== serializedSnapshot) {
            hydrateFromSnapshot(payload.snapshot);
            pushToast("info", "City loaded from cloud.");
          }
        } else {
          lastSyncedHash.current = serializedSnapshot;
        }
        setActiveCityId(cityId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACTIVE_CITY_STORAGE_KEY, cityId);
        }
        setCloudWriteEnabled(true);
      } finally {
        setLoadingCity(false);
        setReadyToSync(true);
      }
    },
    [hydrateFromSnapshot, pushToast, serializedSnapshot]
  );

  const createCity = useCallback(async () => {
    const cityName = window.prompt("New city name:", "My New City");
    if (!cityName) {
      return;
    }
    const baseSlug = toCityIdSlug(cityName);
    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const cityId = `${baseSlug}-${uniqueSuffix}`;
    const response = await fetch("/api/cloud/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId,
        cityName,
        snapshot: localSnapshot
      })
    });
    if (!response.ok) {
      pushToast("error", "Could not create city.");
      return;
    }
    const updated = await listCities();
    setCities(updated);
    await loadCity(cityId);
    pushToast("success", `Created city: ${cityName}`);
  }, [listCities, loadCity, localSnapshot, pushToast]);

  const renameCity = useCallback(async () => {
    const current = cities.find((city) => city.cityId === activeCityId);
    const fallbackName = current?.cityName ?? DEFAULT_CITY_NAME;
    const cityName = window.prompt("Rename city:", fallbackName);
    if (!cityName) {
      return;
    }
    const response = await fetch("/api/cloud/cities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: activeCityId, cityName })
    });
    if (!response.ok) {
      pushToast("error", "Could not rename city.");
      return;
    }
    const updated = await listCities();
    setCities(updated);
    pushToast("success", "City renamed.");
  }, [activeCityId, cities, listCities, pushToast]);

  const deleteCity = useCallback(async () => {
    if (cities.length <= 1) {
      pushToast("warning", "Cannot delete your last city.");
      return;
    }
    const current = cities.find((city) => city.cityId === activeCityId);
    if (!current) {
      pushToast("warning", "Select a city to delete.");
      return;
    }
    const transferLabel = transferToCityId
      ? cities.find((city) => city.cityId === transferToCityId)?.cityName ?? transferToCityId
      : null;
    const confirmed = window.confirm(
      transferLabel
        ? `Delete "${current.cityName}" and transfer its snapshot to "${transferLabel}"?`
        : `Delete "${current.cityName}"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/cloud/cities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId: activeCityId,
        transferToCityId: transferToCityId || undefined
      })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Could not delete city." }))) as {
        error?: string;
      };
      pushToast("error", payload.error ?? "Could not delete city.");
      return;
    }

    const updated = await listCities();
    setCities(updated);
    setTransferToCityId("");

    const nextCityId =
      transferToCityId && updated.some((city) => city.cityId === transferToCityId)
        ? transferToCityId
        : updated[0]?.cityId ?? DEFAULT_CITY_ID;
    if (nextCityId && nextCityId !== activeCityId) {
      await loadCity(nextCityId);
    }
    pushToast("success", "City deleted.");
  }, [activeCityId, cities, listCities, loadCity, pushToast, transferToCityId]);

  useEffect(() => {
    if (isSignedIn) {
      return;
    }
    setCities([]);
    setActiveCityId(DEFAULT_CITY_ID);
    setTransferToCityId("");
    setReadyToSync(false);
    setCloudWriteEnabled(true);
    lastSyncedHash.current = null;
    cloudBootstrapStarted.current = false;
  }, [isSignedIn]);

  useEffect(() => {
    if (!transferToCityId) {
      return;
    }
    const valid = cities.some((city) => city.cityId === transferToCityId && city.cityId !== activeCityId);
    if (!valid) {
      setTransferToCityId("");
    }
  }, [activeCityId, cities, transferToCityId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hydrated || readyToSync || cloudBootstrapStarted.current || !user?.id) {
      return;
    }
    cloudBootstrapStarted.current = true;

    let cancelled = false;
    const bootstrapCloud = async (): Promise<void> => {
      try {
        let cityList = await listCities();
        if (cancelled) {
          return;
        }
        if (cityList.length === 0) {
          const createPrimary = await fetch("/api/cloud/cities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cityId: DEFAULT_CITY_ID,
              cityName: DEFAULT_CITY_NAME,
              snapshot: localSnapshot
            })
          });
          if (!createPrimary.ok) {
            setCloudWriteEnabled(false);
            pushToast("warning", "Cloud save unavailable. Check Supabase server key config.");
            setReadyToSync(true);
            return;
          }
          cityList = await listCities();
          if (cancelled) {
            return;
          }
        }
        setCities(cityList);
        const preferredFromStorage =
          typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_CITY_STORAGE_KEY) : null;
        const targetCityId = cityList.some((city) => city.cityId === preferredFromStorage)
          ? (preferredFromStorage as string)
          : cityList[0]?.cityId ?? DEFAULT_CITY_ID;
        await loadCity(targetCityId);
      } catch {
        // Local fallback remains available if cloud is unreachable.
      } finally {
        if (!cancelled) {
          setReadyToSync(true);
        }
      }
    };

    bootstrapCloud();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isLoaded, isSignedIn, listCities, loadCity, localSnapshot, pushToast, readyToSync, user?.id]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hydrated || !readyToSync || !cloudWriteEnabled || !activeCityId) {
      return;
    }
    if (lastSyncedHash.current === serializedSnapshot) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/cloud/snapshot", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            snapshot: localSnapshot,
            cityId: activeCityId,
            cityName: cities.find((city) => city.cityId === activeCityId)?.cityName ?? DEFAULT_CITY_NAME
          })
        });
        if (response.ok) {
          lastSyncedHash.current = serializedSnapshot;
        }
      } catch {
        // Keep local state and retry on next state change.
      }
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeCityId, cities, cloudWriteEnabled, hydrated, isLoaded, isSignedIn, localSnapshot, readyToSync, serializedSnapshot]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
      <span className="font-medium text-slate-100">City</span>
      <select
        value={activeCityId}
        disabled={loadingCity}
        onChange={(event) => {
          void loadCity(event.target.value);
        }}
        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
      >
        {cities.map((city) => (
          <option key={city.cityId} value={city.cityId}>
            {city.isPrimary ? "★ " : ""}
            {city.cityName}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          void createCity();
        }}
        className="rounded bg-emerald-700 px-2 py-1 text-emerald-50 hover:bg-emerald-600"
      >
        New
      </button>
      <button
        type="button"
        onClick={() => {
          void renameCity();
        }}
        disabled={!activeCityId}
        className="rounded bg-slate-700 px-2 py-1 text-slate-100 hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        Rename
      </button>
      <select
        value={transferToCityId}
        disabled={cities.length <= 1}
        onChange={(event) => setTransferToCityId(event.target.value)}
        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        <option value="">No transfer</option>
        {cities
          .filter((city) => city.cityId !== activeCityId)
          .map((city) => (
            <option key={city.cityId} value={city.cityId}>
              Transfer to: {city.cityName}
            </option>
          ))}
      </select>
      <button
        type="button"
        onClick={() => {
          void deleteCity();
        }}
        disabled={cities.length <= 1 || !activeCityId}
        className="rounded bg-rose-700 px-2 py-1 text-rose-50 hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      >
        Delete
      </button>
      <span className="text-slate-400">
        {loadingCity ? "Loading city..." : readyToSync ? "Synced" : "Preparing cloud sync..."}
      </span>
    </div>
  );
};
