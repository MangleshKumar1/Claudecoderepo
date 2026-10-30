"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MapLoader from "@/components/MapLoader";
import { createTrip } from "@/lib/data";
import { TRIP_STYLES, type TripStyle } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function NewTrip() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pos) return setError("Click the map to mark your destination.");
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || null;
    const start = f.get("start_date") as string;
    const end = f.get("end_date") as string;
    if (end < start) return setError("End date can't be before the start date.");
    setBusy(true);
    setError(null);
    try {
      const id = await createTrip({
        title: text("title")!,
        origin: text("origin"),
        destination: text("destination")!,
        dest_lat: pos.lat,
        dest_lng: pos.lng,
        start_date: start,
        end_date: end,
        budget_per_person: f.get("budget") ? Number(f.get("budget")) : null,
        style: f.get("style") as TripStyle,
        max_buddies: Number(f.get("max_buddies")),
        notes: text("notes"),
      });
      router.push(`/trips/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save trip");
      setBusy(false);
    }
  }

  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to post a trip.</p>;

  return (
    <>
      <h1>Post a trip</h1>
      <p className="muted">Click the map to mark where you're going.</p>
      <MapLoader height={320} onPick={(lat, lng) => setPos({ lat, lng })} picked={pos} />
      <p className="muted">{pos ? `Selected: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : "No destination selected yet"}</p>
      <form className="stack" onSubmit={submit}>
        <label>Trip title<input name="title" required minLength={2} maxLength={120} placeholder="Manali weekend crew" /></label>
        <div className="row">
          <label>From<input name="origin" placeholder="Delhi" /></label>
          <label>Destination<input name="destination" required placeholder="Manali" /></label>
        </div>
        <div className="row">
          <label>Start date<input name="start_date" type="date" required min={todayStr} /></label>
          <label>End date<input name="end_date" type="date" required min={todayStr} /></label>
        </div>
        <div className="row">
          <label>Budget per person (₹, optional)<input name="budget" type="number" min={0} /></label>
          <label>Travel style
            <select name="style" defaultValue="mixed">{TRIP_STYLES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        <label>Max travel buddies (besides you)<input name="max_buddies" type="number" min={1} max={20} defaultValue={4} /></label>
        <label>Notes<textarea name="notes" placeholder="Plans, transport, what you're looking for in buddies…" /></label>
        <button className="primary" disabled={busy}>{busy ? "Posting…" : "Post trip"}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
