"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MapLoader from "@/components/MapLoader";
import ShareButton from "@/components/ShareButton";
import {
  addItem, deleteItem, deleteItinerary, getItinerary, getTrip, listItems, listMembers, swapItems,
  updateItem, updateItinerary,
} from "@/lib/data";
import { TIMES_OF_DAY, type Itinerary, type ItineraryItem, type Place, type TimeOfDay, type Trip } from "@/lib/types";
import { useUser } from "@/lib/useUser";

const ICON: Record<TimeOfDay, string> = { morning: "🌅", afternoon: "☀️", evening: "🌇", night: "🌙" };
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function ItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [it, setIt] = useState<Itinerary | null | undefined>(undefined);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const i = await getItinerary(id);
      setIt(i);
      if (!i) return;
      setItems(await listItems(id));
      if (i.trip_id) {
        setTrip(await getTrip(i.trip_id));
        if (user) {
          const m = await listMembers(i.trip_id);
          setIsMember(m.some((x) => x.user_id === user.id && x.status === "approved"));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id, user]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  const byDay = useMemo(() => {
    const maxDay = Math.max(it?.num_days ?? 1, ...items.map((x) => x.day));
    return Array.from({ length: maxDay }, (_, d) => items.filter((x) => x.day === d + 1));
  }, [items, it]);

  if (it === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (it === null) return <p>Itinerary not found, or it's private. <Link href="/itineraries">Back</Link></p>;

  const isOwner = user?.id === it.user_id;
  const canEdit = Boolean(user) && (isOwner || (Boolean(it.trip_id) && isMember));
  const total = items.reduce((a, x) => a + (x.est_cost ?? 0), 0);
  const pins: Place[] = items.filter((x) => x.lat != null && x.lng != null).map((x) => ({
    id: x.place_id ?? x.id, user_id: it.user_id, title: `Day ${x.day}: ${x.title}`, description: null, category: "offbeat",
    lat: x.lat!, lng: x.lng!, best_season: null, how_to_reach: null, tips: null, photo_url: null, created_at: it.created_at,
  }));
  const center: [number, number] | undefined = pins[0] ? [pins[0].lng, pins[0].lat]
    : it.dest_lat != null && it.dest_lng != null ? [it.dest_lng, it.dest_lat] : undefined;

  async function submitItem(e: React.FormEvent<HTMLFormElement>, day: number, existing?: ItineraryItem) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || null;
    const cost = f.get("est_cost") ? Number(f.get("est_cost")) : null;
    const base = { time_of_day: f.get("time_of_day") as TimeOfDay, title: text("title")!, description: text("description"), est_cost: cost };
    const form = e.currentTarget;
    await run(async () => {
      if (existing) await updateItem(existing.id, base);
      else {
        const pos = Math.max(-1, ...items.filter((x) => x.day === day).map((x) => x.position)) + 1;
        await addItem(id, { ...base, day, position: pos, lat: null, lng: null, place_id: null });
        form.reset();
      }
      setEditing(null);
    });
  }

  const ItemForm = ({ day, item }: { day: number; item?: ItineraryItem }) => (
    <form className="stack itemForm" onSubmit={(e) => submitItem(e, day, item)}>
      <div className="row">
        <label>When<select name="time_of_day" defaultValue={item?.time_of_day ?? "morning"}>{TIMES_OF_DAY.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Cost per person (₹)<input name="est_cost" type="number" min={0} defaultValue={item?.est_cost ?? undefined} /></label>
      </div>
      <label>What<input name="title" required maxLength={160} defaultValue={item?.title} /></label>
      <label>Details<textarea name="description" maxLength={1500} defaultValue={item?.description ?? ""} /></label>
      <div>
        <button className="primary" disabled={busy}>{item ? "Save" : "Add"}</button>
        {item && <> <button type="button" className="link" onClick={() => setEditing(null)}>Cancel</button></>}
      </div>
    </form>
  );

  return (
    <>
      <span className="tag">{it.num_days} day{it.num_days === 1 ? "" : "s"}</span>{" "}
      {it.ai_generated && <span className="badge">AI-assisted</span>}{" "}
      <span className={`badge ${it.is_public ? "good" : ""}`}>{it.is_public ? "Public" : "Private"}</span>
      <h1>{it.title}</h1>
      <p className="muted">
        {it.destination} · by <Link href={`/profile/${it.user_id}`}>{it.owner ?? "a traveller"}</Link>
        {trip && <> · for trip <Link href={`/trips/${trip.id}`}>{trip.title}</Link></>}
      </p>
      {it.is_public && <p><ShareButton title={it.title} label="Share itinerary" /></p>}
      {it.summary && <p>{it.summary}</p>}
      {it.ai_generated && <p className="muted"><small>Generated with AI. Prices and opening hours are estimates, so verify them before you go.</small></p>}

      <p>
        <strong>Estimated cost: {inr(total)} per person</strong>
        {it.budget_per_person != null && (
          <span className={total > it.budget_per_person ? "error" : "ok"}>
            {" "}· budget {inr(it.budget_per_person)} ({total > it.budget_per_person ? `${inr(total - it.budget_per_person)} over` : `${inr(it.budget_per_person - total)} under`})
          </span>
        )}
      </p>

      {pins.length > 0 && <MapLoader height={300} places={pins} center={center} zoom={pins.length > 1 ? 6 : 10} />}

      {byDay.map((dayItems, d) => {
        const day = d + 1;
        const dayTotal = dayItems.reduce((a, x) => a + (x.est_cost ?? 0), 0);
        return (
          <section key={day}>
            <h2>Day {day} {dayTotal > 0 && <small className="muted">· {inr(dayTotal)}</small>}</h2>
            {dayItems.length === 0 && <p className="muted">Nothing planned yet.</p>}
            {dayItems.map((x, i) => (
              <div key={x.id} className="review">
                {editing === x.id ? <ItemForm day={day} item={x} /> : (
                  <>
                    <strong>{ICON[x.time_of_day]} {x.title}</strong>
                    {x.est_cost != null && <span className="muted"> · {inr(x.est_cost)}</span>}
                    {x.place_id && <> · <Link href={`/places/${x.place_id}`}>community pin</Link></>}
                    {x.description && <p>{x.description}</p>}
                    {canEdit && (
                      <small>
                        <button className="link" disabled={busy || i === 0} onClick={() => run(() => swapItems(x, dayItems[i - 1]))}>↑ up</button>{" "}
                        <button className="link" disabled={busy || i === dayItems.length - 1} onClick={() => run(() => swapItems(x, dayItems[i + 1]))}>↓ down</button>{" "}
                        <button className="link" onClick={() => setEditing(x.id)}>edit</button>{" "}
                        <button className="link error" disabled={busy} onClick={() => run(() => deleteItem(x.id))}>delete</button>
                      </small>
                    )}
                  </>
                )}
              </div>
            ))}
            {canEdit && (
              <details className="tips"><summary>+ Add to day {day}</summary><ItemForm day={day} /></details>
            )}
          </section>
        );
      })}

      {isOwner && (
        <p><button className="chip" disabled={busy} onClick={() => run(() => updateItinerary(id, { num_days: Math.min(30, byDay.length + 1) }))}>+ Add a day</button></p>
      )}

      {it.extra_notes && (
        <>
          <h2>Safety &amp; packing</h2>
          <pre className="notes">{it.extra_notes}</pre>
        </>
      )}

      {isOwner && (
        <>
          <h2>Settings</h2>
          <p>
            <button className="chip" disabled={busy} onClick={() => run(() => updateItinerary(id, { is_public: !it.is_public }))}>
              {it.is_public ? "Make private" : "Make public"}
            </button>{" "}
            <button className="link error" disabled={busy}
              onClick={() => { if (confirm("Delete this itinerary?")) run(async () => { await deleteItinerary(id); router.push("/itineraries"); }); }}>
              Delete itinerary
            </button>
          </p>
          <small className="muted">
            {it.trip_id ? "Everyone in the linked trip group can edit the activities." : "Only you can edit this. Link it to a trip (from the trip page) to plan together."}
            {it.is_public && " Anyone can view this itinerary, not just your group."}
          </small>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
