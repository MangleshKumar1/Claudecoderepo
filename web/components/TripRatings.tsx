"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listMyRatingsForTrip, rateUser } from "@/lib/data";
import type { UserRating } from "@/lib/types";

type Person = { id: string; name: string | null };

export default function TripRatings({ tripId, me, people }: { tripId: string; me: string; people: Person[] }) {
  const [mine, setMine] = useState<UserRating[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    listMyRatingsForTrip(tripId).then(setMine).catch((e) => setError(e.message));
  }, [tripId]);
  useEffect(() => { load(); }, [load]);

  const others = people.filter((p) => p.id !== me);
  if (others.length === 0) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>, rateeId: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusyId(rateeId);
    setError(null);
    try {
      await rateUser({
        trip_id: tripId, ratee_id: rateeId, rating: Number(f.get("rating")),
        would_travel_again: f.get("again") === "on",
        comment: ((f.get("comment") as string) || "").trim() || null,
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating");
    }
    setBusyId(null);
  }

  return (
    <>
      <h2>Rate your travel buddies</h2>
      <p className="muted">The trip is over. Honest ratings help other travellers decide who to trust.</p>
      {others.map((p) => {
        const existing = mine.find((r) => r.ratee_id === p.id);
        return (
          <form key={p.id} className="review stack" onSubmit={(e) => submit(e, p.id)} style={{ maxWidth: 480 }}>
            <strong><Link href={`/profile/${p.id}`}>{p.name ?? "Traveller"}</Link></strong>
            {/* key forces defaults to reset after saving */}
            <div className="row" key={existing?.id ?? "new"}>
              <label>Rating (1-5)<input name="rating" type="number" min={1} max={5} required defaultValue={existing?.rating} /></label>
              <label className="check"><input name="again" type="checkbox" defaultChecked={existing?.would_travel_again ?? true} /> Would travel again</label>
            </div>
            <label>Comment (public)<textarea name="comment" maxLength={500} defaultValue={existing?.comment ?? ""} /></label>
            <button className="primary" disabled={busyId === p.id}>{existing ? "Update rating" : "Submit rating"}</button>
          </form>
        );
      })}
      {error && <p className="error">{error}</p>}
    </>
  );
}
