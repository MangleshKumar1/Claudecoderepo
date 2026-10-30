"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MapLoader from "@/components/MapLoader";
import { createItinerary, getTrip, planToItems, requestAiPlan } from "@/lib/data";
import { planExtraNotes } from "@/lib/planSchema";
import { TRIP_STYLES, type Trip, type TripStyle } from "@/lib/types";
import { useUser } from "@/lib/useUser";

const DAY_MS = 86_400_000;

function NewItinerary() {
  const router = useRouter();
  const tripId = useSearchParams().get("trip");
  const { user, loading } = useUser();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState<"ai" | "blank" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    getTrip(tripId).then((t) => {
      setTrip(t);
      if (t) setPos({ lat: t.dest_lat, lng: t.dest_lng });
    }).catch(() => {});
  }, [tripId]);

  const defaultDays = trip
    ? Math.min(10, Math.max(1, Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / DAY_MS) + 1))
    : 3;

  async function submit(e: React.FormEvent<HTMLFormElement>, mode: "ai" | "blank") {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || undefined;
    const days = Number(f.get("days"));
    const budget = f.get("budget") ? Number(f.get("budget")) : null;
    const destination = text("destination")!;
    setBusy(mode);
    setError(null);
    try {
      if (mode === "blank") {
        const id = await createItinerary({
          title: text("title") ?? `${destination} trip`, destination, dest_lat: pos?.lat ?? null, dest_lng: pos?.lng ?? null,
          summary: null, extra_notes: null, start_date: trip?.start_date ?? null, num_days: days,
          budget_per_person: budget, trip_id: tripId, ai_generated: false,
        });
        return router.push(`/itineraries/${id}`);
      }
      const plan = await requestAiPlan({
        destination, lat: pos?.lat ?? null, lng: pos?.lng ?? null, days, budget_per_person: budget,
        travellers: trip ? trip.max_buddies + 1 : undefined,
        style: f.get("style") as TripStyle, interests: text("interests"), notes: text("notes"), origin: trip?.origin ?? undefined,
      });
      const id = await createItinerary({
        title: plan.title, destination, dest_lat: pos?.lat ?? null, dest_lng: pos?.lng ?? null,
        summary: plan.summary, extra_notes: planExtraNotes(plan), start_date: trip?.start_date ?? null,
        num_days: plan.days.length, budget_per_person: budget, trip_id: tripId, ai_generated: true,
      }, planToItems(plan));
      router.push(`/itineraries/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(null);
    }
  }

  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to create an itinerary.</p>;

  // key forces the form defaults to refresh once the trip has loaded
  return (
    <>
      <h1>New itinerary</h1>
      {trip && <p className="muted">For your trip: <strong>{trip.title}</strong>. Everyone in the trip group will be able to edit it.</p>}
      <p className="muted">Click the map to mark the area (optional, but it helps the AI use real community pins and gives map markers).</p>
      <MapLoader height={260} onPick={(lat, lng) => setPos({ lat, lng })} picked={pos}
        center={trip ? [trip.dest_lng, trip.dest_lat] : undefined} zoom={trip ? 8 : undefined} />
      <form key={trip?.id ?? "none"} className="stack" onSubmit={(e) => submit(e, "ai")} style={{ marginTop: 16 }}>
        <label>Destination<input name="destination" required minLength={2} maxLength={120} defaultValue={trip?.destination ?? ""} placeholder="Manali, Himachal Pradesh" /></label>
        <div className="row">
          <label>Number of days<input name="days" type="number" min={1} max={10} required defaultValue={defaultDays} /></label>
          <label>Budget per person (₹, optional)<input name="budget" type="number" min={0} defaultValue={trip?.budget_per_person ?? undefined} /></label>
        </div>
        <label>Travel style
          <select name="style" defaultValue={trip?.style ?? "mixed"}>{TRIP_STYLES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label>Interests<input name="interests" maxLength={300} placeholder="trekking, local food, photography, cafes" /></label>
        <label>Anything else?<textarea name="notes" maxLength={500} placeholder="Travelling with parents, no early mornings, vegetarian…" /></label>
        <div>
          <button className="primary" disabled={busy !== null}>{busy === "ai" ? "Planning… this can take up to a minute" : "✨ Plan with AI"}</button>{" "}
          <button type="button" className="chip" disabled={busy !== null}
            onClick={(e) => { const form = (e.currentTarget as HTMLButtonElement).form!; if (form.reportValidity()) submit({ currentTarget: form, preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>, "blank"); }}>
            Start blank
          </button>
        </div>
        <small className="muted">AI plans are suggestions. Check prices, opening hours and safety before you go.</small>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><NewItinerary /></Suspense>;
}
