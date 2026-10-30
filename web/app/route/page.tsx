"use client";
import { useEffect, useMemo, useState } from "react";
import MapLoader from "@/components/MapLoader";
import PlaceCard from "@/components/PlaceCard";
import { track } from "@/lib/analytics";
import { listPlaces } from "@/lib/data";
import { distanceKm, distanceToSegmentKm, type LatLng } from "@/lib/geo";
import { CATEGORIES, type Category, type Place } from "@/lib/types";

export default function RouteDiscovery() {
  const [from, setFrom] = useState<LatLng | null>(null);
  const [to, setTo] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(20);
  const [category, setCategory] = useState<Category | "all">("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listPlaces().then(setPlaces).catch((e) => setError(e.message)); }, []);

  // 1st click = start, 2nd = destination, 3rd click starts over
  function pick(lat: number, lng: number) {
    if (!from || (from && to)) { setFrom({ lat, lng }); setTo(null); }
    else setTo({ lat, lng });
  }

  const along = useMemo(() => {
    if (!from || !to) return [];
    return places
      .filter((p) => category === "all" || p.category === category)
      .map((p) => ({ p, ...distanceToSegmentKm({ lat: p.lat, lng: p.lng }, from, to) }))
      .filter((x) => x.km <= radius)
      .sort((a, b) => a.t - b.t); // in order of travel from start to destination
  }, [places, from, to, radius, category]);

  useEffect(() => { if (from && to) track("route_search", { radius_km: radius }); }, [from, to, radius]);

  const total = from && to ? Math.round(distanceKm(from.lat, from.lng, to.lat, to.lng)) : null;

  return (
    <>
      <h1>Discover along your route</h1>
      <p className="muted">
        Click the map for your start, then your destination. We list community pins within a corridor of that straight line,
        in the order you'd pass them. It's a rough guide, not turn-by-turn roads, so check real routes before you drive.
      </p>
      <MapLoader height={380} onPick={pick} places={along.map((x) => x.p)}
        extra={[...(from ? [{ ...from, color: "#16a34a", label: "Start" }] : []), ...(to ? [{ ...to, color: "#dc2626", label: "Destination" }] : [])]} />
      <p className="muted">
        {!from ? "Click to set your start." : !to ? "Now click your destination." : `Straight-line distance about ${total} km. Click again to start over.`}
      </p>
      <div className="row" style={{ maxWidth: 520 }}>
        <label>Corridor width: {radius} km each side
          <input type="range" min={5} max={50} step={5} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </label>
        <label>Type
          <select value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}>
            <option value="all">all</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {from && to && (
        <>
          <h2>{along.length} place{along.length === 1 ? "" : "s"} along the way</h2>
          {along.length === 0 && <p className="muted">Nothing pinned here yet. Know a great stop on this route? Pin it!</p>}
          <div className="grid">
            {along.map((x) => (
              <div key={x.p.id}>
                <small className="muted">{Math.round(x.t * (total ?? 0))} km from start · {x.km.toFixed(1)} km off the line</small>
                <PlaceCard place={x.p} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
