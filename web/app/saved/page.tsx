"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PlaceCard from "@/components/PlaceCard";
import { listPlaces, listSavedIds } from "@/lib/data";
import type { Place } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function Saved() {
  const { user, loading } = useUser();
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listPlaces(), listSavedIds()]).then(([all, ids]) =>
      setPlaces(all.filter((p) => ids.includes(p.id))),
    );
  }, [user]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <p>Please <Link href="/login">log in</Link> to see saved places.</p>;
  return (
    <>
      <h1>Saved places</h1>
      {places.length === 0 && <p className="muted">Nothing saved yet.</p>}
      <div className="grid">{places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
    </>
  );
}
