"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AiSearch from "@/components/AiSearch";
import EmptyState from "@/components/EmptyState";
import MapLoader from "@/components/MapLoader";
import PlaceCard from "@/components/PlaceCard";
import { CardSkeletons } from "@/components/Skeletons";
import { catEmoji, catLabel } from "@/lib/categories";
import { listPlaces } from "@/lib/data";
import { CATEGORIES, type Category, type Place } from "@/lib/types";

function Explore() {
  const router = useRouter();
  const params = useSearchParams();
  const initialCat = params.get("cat") as Category | null;
  const [category, setCategory] = useState<Category | "all">(initialCat && CATEGORIES.includes(initialCat) ? initialCat : "all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlaces(null);
    listPlaces(category).then(setPlaces).catch((e) => setError(e.message));
  }, [category]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return places ?? [];
    return (places ?? []).filter((p) =>
      [p.title, p.description, p.how_to_reach, p.tips, catLabel(p.category)].some((t) => (t ?? "").toLowerCase().includes(s)));
  }, [places, q]);

  return (
    <>
      <h1>Explore</h1>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); router.replace(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, place or tip…" aria-label="Search places" />
      </form>
      <AiSearch />
      <div className="filters" role="group" aria-label="Filter by type">
        <button className={`chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{catEmoji(c)} {catLabel(c)}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <MapLoader places={shown} />
      {!places && !error && <CardSkeletons />}
      {places && shown.length === 0 && (
        <EmptyState emoji="🔎" title="Nothing found" text={q ? "Try a different word, or clear the filters." : "No pins in this category yet."} href="/places/new" action="Pin a place" />
      )}
      <div className="grid">{shown.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<CardSkeletons />}><Explore /></Suspense>;
}
