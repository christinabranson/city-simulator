import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Head from "next/head";

import { BuildingPalette } from "@/components/BuildingPalette";
import { CityGrid } from "@/components/CityGrid";
import { CloudSyncBridge } from "@/components/CloudSyncBridge";
import { ConstructionQueuePanel } from "@/components/ConstructionQueuePanel";
import { DemandPanel } from "@/components/DemandPanel";
import { ResourcePanel } from "@/components/ResourcePanel";
import { SocialPanel } from "@/components/SocialPanel";
import { TileInspectorModal } from "@/components/TileInspectorModal";
import { ToastStack } from "@/components/ToastStack";
import { useHydratedGame } from "@/hooks/useHydratedGame";
import { useGameStore } from "@/game/state/useGameStore";

export default function Home() {
  useHydratedGame();
  const hydrated = useGameStore((state) => state.hydrated);
  const { isSignedIn } = useUser();

  return (
    <>
      <Head>
        <title>City Sim MVP</title>
        <meta name="description" content="Mechanics-first city simulation prototype" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="mx-auto min-h-full max-w-7xl bg-gradient-to-b from-indigo-950/35 via-blue-950/30 to-slate-950/40 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">City Builder Prototype</h1>
          <div className="flex items-center gap-2">
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded bg-sky-700 px-3 py-1 text-xs text-sky-50 hover:bg-sky-600"
                >
                  Sign in for cloud saves
                </button>
              </SignInButton>
            ) : null}
            {isSignedIn ? <UserButton /> : null}
          </div>
        </div>
        {!isSignedIn ? (
          <p className="mb-3 rounded bg-slate-900 px-3 py-2 text-xs text-slate-300">
            Signed out: progress stays local on this device. Sign in to sync with cloud storage.
          </p>
        ) : null}
        {!hydrated ? (
          <p className="rounded bg-slate-900 p-3 text-slate-200">Loading game state...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <ResourcePanel />
              <CityGrid />
            </div>
            <div className="space-y-4">
              <BuildingPalette />
              <DemandPanel />
              <ConstructionQueuePanel />
              <SocialPanel />
            </div>
          </div>
        )}
        <CloudSyncBridge />
        <TileInspectorModal />
        <ToastStack />
      </main>
    </>
  );
}
