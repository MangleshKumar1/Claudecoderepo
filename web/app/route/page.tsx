"use client";
import { useEffect, useMemo, useState } from "react";
import MapLoader from "@/components/MapLoader";
import PlaceCard from "@/components/PlaceCard";
import { track } from "@/lib/analytics";
import { listPlaces } from "@/lib/data";
import { fuelCost } from "@/lib/fuel";
import { distanceKm, distanceToSegmentKm, type LatLng } from "@/lib/geo";
import { CATEGORIES, type Category, type Place } from "@/lib/types";

export default function RouteDiscovery() {
  const [from, setFrom] = useState<LatLng | null>(null);
  const [to, setTo] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(20);
  const [category, setCategory] = useState<Category | "all">("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fuel, setFuel] = useState({ kmPerLitre: "15", price: "100", people: "2", roundTrip: true, factor: "1.3" });

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
  const fc = total != null ? fuelCost({ straightKm: total, roadFactor: Number(fuel.factor) || 1.3, roundTrip: fuel.roundTrip, kmPerLitre: Number(fuel.kmPerLitre), pricePerLitre: Number(fuel.price), people: Math.max(1, Number(fuel.people) || 1) }) : null;

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
      {from && to && fc && (
        <details className="tips" open>
          <summary>⛽ Fuel cost estimate</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="row">
              <label>Mileage (km per litre)<input type="number" min={1} step="0.5" value={fuel.kmPerLitre} onChange={(e) => setFuel({ ...fuel, kmPerLitre: e.target.value })} /></label>
              <label>Fuel price (₹ per litre)<input type="number" min={1} step="0.5" value={fuel.price} onChange={(e) => setFuel({ ...fuel, price: e.target.value })} /></label>
            </div>
            <div className="row">
              <label>People sharing<input type="number" min={1} max={20} value={fuel.people} onChange={(e) => setFuel({ ...fuel, people: e.target.value })} /></label>
              <label>Road is longer by ×<select value={fuel.factor} onChange={(e) => setFuel({ ...fuel, factor: e.target.value })}>
                <option value="1.2">1.2 (straight highway)</option><option value="1.3">1.3 (typical)</option><option value="1.5">1.5 (winding / hills)</option><option value="1.7">1.7 (very winding)</option>
              </select></label>
            </div>
            <label className="check"><input type="checkbox" checked={fuel.roundTrip} onChange={(e) => setFuel({ ...fuel, roundTrip: e.target.checked })} /> Round trip</label>
          </div>
          <p><strong>About ₹{Math.round(fc.cost).toLocaleString("en-IN")}</strong> in fuel ({Math.round(fc.totalKm)} km, {fc.litres.toFixed(1)} litres) · about <strong>₹{Math.round(fc.perPerson).toLocaleString("en-IN")} per person</strong></p>
          <p className="muted"><small>A rough estimate from the straight-line distance. Tolls, parking and detours are extra. We don't have toll data yet, so check your route in a maps app.</small></p>
        </details>
      )}
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
