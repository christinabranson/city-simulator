import { getAuth } from "@clerk/nextjs/server";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { GameStateSnapshot } from "@/types/game";

const SNAPSHOT_SCHEMA_VERSION = "v1";

type CityRow = {
  user_id: string;
  city_id: string;
  city_name: string;
  snapshot_json: GameStateSnapshot;
  is_primary?: boolean;
  schema_version?: string;
  source?: string;
  metadata_json?: Record<string, unknown>;
  created_at?: string;
  last_played_at?: string | null;
  last_updated: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_reason?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin client unavailable for cities route");
    res.status(500).json({ error: "Supabase env not configured." });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("city_snapshots")
      .select("city_id, city_name, is_primary, created_at, last_updated, metadata_json")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("last_updated", { ascending: false });

    if (error) {
      console.error("City list GET failed", error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({
      cities: (data ?? []).map((row) => ({
        cityId: row.city_id,
        cityName: row.city_name,
        isPrimary: Boolean(row.is_primary),
        createdAt: row.created_at,
        updatedAt: row.last_updated,
        metadataJson: row.metadata_json ?? {}
      }))
    });
    return;
  }

  if (req.method === "POST") {
    const cityIdRaw = req.body?.cityId;
    const cityNameRaw = req.body?.cityName;
    const snapshot = req.body?.snapshot as GameStateSnapshot | undefined;
    const cityId = typeof cityIdRaw === "string" ? cityIdRaw.trim() : "";
    const cityName = typeof cityNameRaw === "string" ? cityNameRaw.trim() : "";

    if (!cityId || !cityName || !snapshot) {
      res.status(400).json({ error: "cityId, cityName, and snapshot are required." });
      return;
    }

    const { error } = await supabase.from("city_snapshots").upsert(
      {
        user_id: userId,
        city_id: cityId,
        city_name: cityName,
        snapshot_json: snapshot,
        is_primary: cityId === "primary",
        schema_version: SNAPSHOT_SCHEMA_VERSION,
        source: "web",
        last_played_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_reason: null
      } satisfies CityRow,
      { onConflict: "user_id,city_id" }
    );

    if (error) {
      console.error("City create POST failed", error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true, cityId, cityName });
    return;
  }

  if (req.method === "PATCH") {
    const cityIdRaw = req.body?.cityId;
    const cityNameRaw = req.body?.cityName;
    const metadataJsonRaw = req.body?.metadataJson as Record<string, unknown> | undefined;
    const cityId = typeof cityIdRaw === "string" ? cityIdRaw.trim() : "";
    const cityName = typeof cityNameRaw === "string" ? cityNameRaw.trim() : "";
    const metadataJsonProvided = metadataJsonRaw !== undefined;
    if (!cityId || (!cityName && !metadataJsonProvided)) {
      res.status(400).json({ error: "cityId plus cityName or metadataJson is required." });
      return;
    }
    if (metadataJsonProvided && (!metadataJsonRaw || Array.isArray(metadataJsonRaw))) {
      res.status(400).json({ error: "metadataJson must be an object." });
      return;
    }

    const updatePayload: Record<string, unknown> = {
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (cityName) {
      updatePayload.city_name = cityName;
    }
    if (metadataJsonProvided) {
      updatePayload.metadata_json = metadataJsonRaw;
    }

    const { error } = await supabase
      .from("city_snapshots")
      .update(updatePayload)
      .eq("user_id", userId)
      .eq("city_id", cityId)
      .is("deleted_at", null);

    if (error) {
      console.error("City rename PATCH failed", error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true, cityId, cityName: cityName || null, metadataUpdated: metadataJsonProvided });
    return;
  }

  if (req.method === "DELETE") {
    const cityIdRaw = req.body?.cityId;
    const transferToCityIdRaw = req.body?.transferToCityId;
    const cityId = typeof cityIdRaw === "string" ? cityIdRaw.trim() : "";
    const transferToCityId = typeof transferToCityIdRaw === "string" ? transferToCityIdRaw.trim() : "";
    if (!cityId) {
      res.status(400).json({ error: "cityId is required." });
      return;
    }
    if (transferToCityId && transferToCityId === cityId) {
      res.status(400).json({ error: "transferToCityId must be different from cityId." });
      return;
    }

    const { data: cities, error: listError } = await supabase
      .from("city_snapshots")
      .select("city_id, city_name, snapshot_json")
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (listError) {
      console.error("City delete list failed", listError);
      res.status(500).json({ error: listError.message });
      return;
    }

    const ownedCities = cities ?? [];
    if (ownedCities.length <= 1) {
      res.status(400).json({ error: "Cannot delete the last city." });
      return;
    }

    const sourceCity = ownedCities.find((city) => city.city_id === cityId);
    if (!sourceCity) {
      res.status(404).json({ error: "City not found." });
      return;
    }

    if (transferToCityId) {
      const targetCity = ownedCities.find((city) => city.city_id === transferToCityId);
      if (!targetCity) {
        res.status(400).json({ error: "Transfer target city not found." });
        return;
      }

      const { error: transferError } = await supabase
        .from("city_snapshots")
        .update({
          snapshot_json: sourceCity.snapshot_json,
          last_played_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("city_id", transferToCityId);
      if (transferError) {
        console.error("City delete transfer failed", transferError);
        res.status(500).json({ error: transferError.message });
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("city_snapshots")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: transferToCityId ? "user_soft_delete_with_transfer" : "user_soft_delete",
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("city_id", cityId);
    if (deleteError) {
      console.error("City delete failed", deleteError);
      res.status(500).json({ error: deleteError.message });
      return;
    }

    res.status(200).json({ ok: true, cityId, transferToCityId: transferToCityId || null });
    return;
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed." });
}
