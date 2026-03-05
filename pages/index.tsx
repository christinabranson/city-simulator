import Head from "next/head";

import { BuildingPalette } from "@/components/BuildingPalette";
import { CityGrid } from "@/components/CityGrid";
import { ConstructionQueuePanel } from "@/components/ConstructionQueuePanel";
import { DemandPanel } from "@/components/DemandPanel";
import { ResourcePanel } from "@/components/ResourcePanel";
import { SocialPanel } from "@/components/SocialPanel";
import { TileInspectorModal } from "@/components/TileInspectorModal";
import { useHydratedGame } from "@/hooks/useHydratedGame";
import { useGameStore } from "@/game/state/useGameStore";

export default function Home() {
  useHydratedGame();
  const hydrated = useGameStore((state) => state.hydrated);

  return (
    <>
      <Head>
        <title>City Sim MVP</title>
        <meta name="description" content="Mechanics-first city simulation prototype" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="mx-auto min-h-full max-w-7xl p-4">
        <h1 className="mb-4 text-2xl font-bold">City Builder Prototype</h1>
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
        <TileInspectorModal />
      </main>
    </>
  );
}
