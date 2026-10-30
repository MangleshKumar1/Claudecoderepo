import { getSupabase } from "./supabase";
import type { LatLng } from "./geo";

export type RoadRoute = { coords: [number, number][]; km: number; minutes: number };

/** Asks the server for a driving route. Throws an Error with a friendly message (and `.unavailable` when routing isn't set up). */
export async function fetchRoadRoute(from: LatLng, to: LatLng): Promise<RoadRoute> {
  const sb = getSupabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
  if (!token) throw Object.assign(new Error("Log in to see the road route."), { unavailable: true });
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ from, to }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? "Could not get the road route."), { unavailable: Boolean(body.unavailable) });
  return body as RoadRoute;
}
