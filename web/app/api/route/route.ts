import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAi } from "@/lib/aiServer";
import { downsample } from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 30;

const Pt = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const Body = z.object({ from: Pt, to: Pt });
const ORS = process.env.ORS_BASE_URL || "https://api.openrouteservice.org";

/**
 * Driving route between two points using OpenRouteService (free key). The key stays on the server.
 * Returns a simplified line as [lat, lng] pairs plus distance and time.
 */
export async function POST(req: Request) {
  const key = process.env.ORS_API_KEY;
  if (!key) return NextResponse.json({ error: "Road routing isn't set up, so a straight line is used.", unavailable: true }, { status: 503 });
  const g = await guardAi(req, "route");
  if (g instanceof NextResponse) return g;
  let body;
  try { body = Body.parse(await req.json()); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const over = await g.reserve();
  if (over) return over;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(`${ORS}/v2/directions/driving-car/geojson`, {
      method: "POST", signal: ctl.signal,
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[body.from.lng, body.from.lat], [body.to.lng, body.to.lat]] }),
    });
    if (res.status === 404 || res.status === 400) return NextResponse.json({ error: "No driving route was found between those two points. Try points closer to a road." }, { status: 422 });
    if (res.status === 401 || res.status === 403) { console.error("OpenRouteService rejected the API key"); return NextResponse.json({ error: "Road routing is misconfigured, so a straight line is used.", unavailable: true }, { status: 503 }); }
    if (res.status === 429) return NextResponse.json({ error: "The routing service is busy. Please try again in a minute." }, { status: 429 });
    if (!res.ok) { console.error("OpenRouteService error", res.status); return NextResponse.json({ error: "The routing service had a problem. Please try again." }, { status: 502 }); }

    const json = (await res.json()) as { features?: { geometry?: { coordinates?: unknown }; properties?: { summary?: { distance?: unknown; duration?: unknown } } }[] };
    const f = json.features?.[0];
    const raw = f?.geometry?.coordinates;
    const metres = Number(f?.properties?.summary?.distance);
    const seconds = Number(f?.properties?.summary?.duration);
    if (!Array.isArray(raw) || raw.length < 2 || !Number.isFinite(metres) || !Number.isFinite(seconds)) {
      return NextResponse.json({ error: "The routing service returned something unexpected." }, { status: 502 });
    }
    const pts: [number, number][] = [];
    for (const c of raw) {
      if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number" && Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180) pts.push([c[1], c[0]]); // ORS gives [lng, lat]
    }
    if (pts.length < 2 || metres > 6_000_000) return NextResponse.json({ error: "The routing service returned something unexpected." }, { status: 502 });
    return NextResponse.json({ coords: downsample(pts, 400), km: Math.round(metres / 100) / 10, minutes: Math.round(seconds / 60) });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return NextResponse.json({ error: "The routing service took too long. Please try again." }, { status: 504 });
    console.error("Routing failed", e);
    return NextResponse.json({ error: "Something went wrong with routing." }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
