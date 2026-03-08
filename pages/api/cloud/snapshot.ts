import { getAuth } from "@clerk/nextjs/server";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GameStateSnapshot } from "@/types/game";

const SNAPSHOT_SCHEMA_VERSION = "v1";

type SnapshotRow = {
  user_id: string;
  city_id: string;
  city_name: string;
  is_primary?: boolean;
  schema_version?: string;
  source?: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  last_played_at?: string | null;
  last_updated: string;
  snapshot_json: GameStateSnapshot;
  updated_at?: string;
  deleted_at: string | null;
  deleted_reason?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cityIdRaw = req.query.cityId;
  const cityId = typeof cityIdRaw === "string" && cityIdRaw.trim() ? cityIdRaw : "primary";

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin client unavailable: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    res.status(500).json({ error: "Supabase env not configured." });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("city_snapshots")
      .select("snapshot_json, city_id, city_name, last_updated")
      .eq("user_id", userId)
      .eq("city_id", cityId)
      .is("deleted_at", null)
      .maybeSingle<Pick<SnapshotRow, "snapshot_json" | "last_updated" | "city_id" | "city_name">>();

    if (error) {
      console.error("Snapshot GET failed", error);
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({
      snapshot: data?.snapshot_json ?? null,
      updatedAt: data?.last_updated ?? null,
      cityId: data?.city_id ?? cityId,
      cityName: data?.city_name ?? "My City"
    });
    return;
  }

  if (req.method === "PUT") {
    const snapshot = req.body?.snapshot as GameStateSnapshot | undefined;
    const requestedCityId = req.body?.cityId;
    const cityIdFromBody = typeof requestedCityId === "string" && requestedCityId.trim() ? requestedCityId : cityId;
    const requestedCityName = req.body?.cityName;
    const cityName =
      typeof requestedCityName === "string" && requestedCityName.trim() ? requestedCityName.trim() : "My City";
    if (!snapshot) {
      res.status(400).json({ error: "Missing snapshot payload." });
      return;
    }

    const { error } = await supabase.from("city_snapshots").upsert(
      {
        user_id: userId,
        city_id: cityIdFromBody,
        city_name: cityName,
        snapshot_json: snapshot,
        is_primary: cityIdFromBody === "primary",
        schema_version: SNAPSHOT_SCHEMA_VERSION,
        source: "web",
        last_played_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_reason: null
      },
      { onConflict: "user_id,city_id" }
    );
    if (error) {
      console.error("Snapshot PUT failed", error);
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ ok: true, cityId: cityIdFromBody, cityName });
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed." });
}
