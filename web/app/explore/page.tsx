"use client";
import { useEffect, useState } from "react";
import MapLoader from "@/components/MapLoader";
import PlaceCard from "@/components/PlaceCard";
import { listPlaces } from "@/lib/data";
import { CATEGORIES, type Category, type Place } from "@/lib/types";

export default function Explore() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlaces(category).then(setPlaces).catch((e) => setError(e.message));
  }, [category]);

  return (
    <>
      <h1>Explore</h1>
      <div className="filters">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
            {c.replace("_", " ")}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <MapLoader places={places} />
      <div className="grid">{places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
    </>
  );
}
