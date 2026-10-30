"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TripCard from "@/components/TripCard";
import { listMyTrips, listTrips } from "@/lib/data";
import { findMatches } from "@/lib/match";
import type { Trip } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function Trips() {
  const { user } = useUser();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [mine, setMine] = useState<Trip[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrips().then(setTrips).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (user) listMyTrips().then(setMine).catch(() => {});
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (trips ?? []).filter(
      (t) => !s || t.destination.toLowerCase().includes(s) || t.title.toLowerCase().includes(s) ||
        (t.origin ?? "").toLowerCase().includes(s),
    );
  }, [trips, q]);

  const matches = useMemo(
    () => mine.map((m) => ({ mine: m, found: findMatches(m, trips ?? []) })).filter((x) => x.found.length),
    [mine, trips],
  );

  return (
    <>
      <h1>Find people going your way</h1>
      <p className="muted">
        Post where you're going and when. We'll show other travellers heading to the same place on overlapping dates.
      </p>
      <p><Link href="/trips/new" className="chip active">+ Post a trip</Link></p>

      {matches.length > 0 && (
        <>
          <h2>Matches for your trips</h2>
          {matches.map(({ mine: m, found }) => (
            <div key={m.id}>
              <h3 className="muted">{m.title} ({m.destination})</h3>
              <div className="grid">
                {found.map((f) => (
                  <TripCard key={f.trip.id} trip={f.trip}
                    note={`${f.overlap} day${f.overlap === 1 ? "" : "s"} overlap`} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <h2>Upcoming trips</h2>
      <input placeholder="Search destination, origin or title" value={q} onChange={(e) => setQ(e.target.value)}
        style={{ width: "100%", maxWidth: 420 }} />
      {error && <p className="error">{error}</p>}
      {!trips && !error && <p className="muted">Loading…</p>}
      {trips && filtered.length === 0 && <p className="muted">No trips found. Post the first one!</p>}
      <div className="grid">{filtered.map((t) => <TripCard key={t.id} trip={t} />)}</div>
    </>
  );
}
