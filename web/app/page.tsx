"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import PlaceCard from "@/components/PlaceCard";
import { listPlaces } from "@/lib/data";
import type { Place } from "@/lib/types";

export default function Home() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlaces().then(setPlaces).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Find beautiful places. Share real experiences.</h1>
        <p className="muted">
          Pin hidden gems on the map, read honest reviews with real prices, and save places for your next trip.
        </p>
        <p>
          <Link href="/explore" className="chip active">Explore the map</Link>{" "}
          <Link href="/places/new" className="chip">Pin a place</Link>
        </p>
      </section>
      <h2>Latest pins</h2>
      {error && <p className="error">{error}</p>}
      {!places && !error && <p className="muted">Loading…</p>}
      {places && places.length === 0 && <p className="muted">No pins yet. Be the first to pin a place!</p>}
      <div className="grid">{places?.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
    </>
  );
}
