"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ItineraryCard from "@/components/ItineraryCard";
import { listMyItineraries, listPublicItineraries } from "@/lib/data";
import type { Itinerary } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function Itineraries() {
  const { user } = useUser();
  const [mine, setMine] = useState<Itinerary[]>([]);
  const [pub, setPub] = useState<Itinerary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listPublicItineraries().then(setPub).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (user) listMyItineraries().then(setMine).catch((e) => setError(e.message)); }, [user]);

  const mineIds = new Set(mine.map((m) => m.id));
  return (
    <>
      <h1>Itineraries</h1>
      <p className="muted">Plan day by day, with or without AI. Share it publicly, or keep it for your travel group.</p>
      <p><Link href="/itineraries/new" className="chip active">+ New itinerary</Link></p>
      {error && <p className="error">{error}</p>}

      {user && (
        <>
          <h2>Your itineraries</h2>
          {mine.length === 0 && <p className="muted">None yet. Try the AI planner!</p>}
          <div className="grid">{mine.map((i) => <ItineraryCard key={i.id} it={i} />)}</div>
        </>
      )}

      <h2>Shared by travellers</h2>
      {!pub && !error && <p className="muted">Loading…</p>}
      {pub && pub.filter((p) => !mineIds.has(p.id)).length === 0 && <p className="muted">No public itineraries yet.</p>}
      <div className="grid">{pub?.filter((p) => !mineIds.has(p.id)).map((i) => <ItineraryCard key={i.id} it={i} />)}</div>
    </>
  );
}
