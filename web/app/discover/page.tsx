"use client";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import PlaceCard from "@/components/PlaceCard";
import { CardSkeletons } from "@/components/Skeletons";
import { track } from "@/lib/analytics";
import { catEmoji, catLabel } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { listPlaces } from "@/lib/data";
import { discover, pickRandom } from "@/lib/discover";
import { CATEGORIES, type Category, type Place } from "@/lib/types";
import Link from "next/link";

export default function Discover() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [cityIdx, setCityIdx] = useState(0);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [maxKm, setMaxKm] = useState(300);
  const [category, setCategory] = useState<Category | "all">("all");
  const [budget, setBudget] = useState("");
  const [surprise, setSurprise] = useState<Place | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listPlaces().then(setPlaces).catch((e) => setError(e.message)); }, []);

  const from = here ?? CITIES[cityIdx];
  const matches = useMemo(
    () => discover(places ?? [], { from, maxKm, category, maxBudgetPerDay: budget ? Number(budget) : null }),
    [places, from, maxKm, category, budget],
  );

  function useMyLocation() {
    if (!navigator.geolocation) return setGeoMsg("Your browser can't share location. Pick a city instead.");
    setGeoMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setHere({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoMsg("Using your current location (it stays in your browser)."); },
      () => setGeoMsg("Couldn't get your location. Pick a city instead."),
      { timeout: 10_000 },
    );
  }

  return (
    <>
      <h1>Discover</h1>
      <p className="muted">Find somewhere to go from where you are: a weekend escape, a budget trip, or let us surprise you.</p>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="row">
          <label>Starting from
            <select value={here ? "me" : cityIdx} onChange={(e) => { setHere(null); setCityIdx(Number(e.target.value)); setSurprise(null); }}>
              {here && <option value="me">📍 My location</option>}
              {CITIES.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
            </select>
          </label>
          <label>Type
            <select value={category} onChange={(e) => { setCategory(e.target.value as Category | "all"); setSurprise(null); }}>
              <option value="all">Anything</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{catEmoji(c)} {catLabel(c)}</option>)}
            </select>
          </label>
        </div>
        <label>Within {maxKm} km
          <input type="range" min={50} max={1500} step={50} value={maxKm} onChange={(e) => { setMaxKm(Number(e.target.value)); setSurprise(null); }} />
        </label>
        <div className="filters" style={{ margin: 0 }}>
          <button className="chip" onClick={() => { setMaxKm(300); setSurprise(null); }}>🌄 Weekend (300 km)</button>
          <button className="chip" onClick={useMyLocation}>📍 Use my location</button>
        </div>
        <label>Max budget per day (₹, optional)
          <input type="number" min={0} value={budget} onChange={(e) => { setBudget(e.target.value); setSurprise(null); }} placeholder="e.g. 2000" />
        </label>
        {budget && <small className="muted">Budget search only includes places where travellers have shared a typical daily cost, so it will show fewer results.</small>}
        {geoMsg && <small className="muted">{geoMsg}</small>}
        <div>
          <button className="btn lg" disabled={matches.length === 0} onClick={() => { setSurprise(pickRandom(matches.map((m) => m.place))); track("surprise_me"); }}>🎲 Surprise me</button>
        </div>
      </div>

      {surprise && (
        <>
          <h2>Your surprise</h2>
          <div style={{ maxWidth: 360 }}><PlaceCard place={surprise} /></div>
          <p><button className="chip" onClick={() => setSurprise(pickRandom(matches.map((m) => m.place)))}>↻ Another one</button></p>
        </>
      )}

      <h2>{matches.length} place{matches.length === 1 ? "" : "s"} within {maxKm} km</h2>
      {error && <p className="error">{error}</p>}
      {!places && !error && <CardSkeletons n={3} />}
      {places && matches.length === 0 && <EmptyState emoji="🧭" title="Nothing matches yet" text="Try a bigger distance or fewer filters. Know a great spot nearby? Pin it for others." href="/places/new" action="Pin a place" />}
      <div className="grid">
        {matches.map((m) => (
          <div key={m.place.id}>
            <small className="muted">{Math.round(m.km)} km away{m.place.typical_cost_per_day != null ? ` · about ₹${m.place.typical_cost_per_day.toLocaleString("en-IN")}/day` : ""}</small>
            <PlaceCard place={m.place} />
          </div>
        ))}
      </div>
      <p className="muted"><small>Distances are straight-line. Road distance is longer. <Link href="/route">Plan along a route →</Link></small></p>
    </>
  );
}
