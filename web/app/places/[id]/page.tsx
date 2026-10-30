"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MapLoader from "@/components/MapLoader";
import { catEmoji, catLabel } from "@/lib/categories";
import PhotoGallery from "@/components/PhotoGallery";
import PhotoUploader from "@/components/PhotoUploader";
import ShareButton from "@/components/ShareButton";
import {
  createReview, getPlace, getPlaceStats, listPlacePhotos, listPlaceReports, listReviews, listSavedIds, reportCondition,
  toggleSave,
} from "@/lib/data";
import { CONDITION_KINDS, type ConditionKind, type Place, type PlacePhoto, type PlaceReport, type PlaceStats, type Review } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [place, setPlace] = useState<Place | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<PlaceStats | null>(null);
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [conditions, setConditions] = useState<PlaceReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlace(await getPlace(id));
      setReviews(await listReviews(id));
      setStats(await getPlaceStats(id));
      setPhotos(await listPlacePhotos(id));
      setConditions(await listPlaceReports(id));
      setSaved((await listSavedIds()).includes(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => { load(); }, [load, user]);

  async function onSave() {
    try {
      await toggleSave(id, saved);
      setSaved(!saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || null;
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
    setBusy(true);
    setError(null);
    try {
      await createReview({
        place_id: id,
        rating: Number(f.get("rating")),
        pros: text("pros"),
        cons: text("cons"),
        price_paid: num("price_paid"),
        price_note: text("price_note"),
        currency: "INR",
        value_rating: num("value_rating"),
        safety_rating: num("safety_rating"),
        beauty_rating: num("beauty_rating"),
        accessibility_rating: num("accessibility_rating"),
        cleanliness_rating: num("cleanliness_rating"),
        crowd_rating: num("crowd_rating"),
        visited_on: text("visited_on"),
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    }
    setBusy(false);
  }

  async function submitCondition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const note = ((f.get("note") as string) || "").trim() || null;
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await reportCondition(id, f.get("kind") as ConditionKind, note);
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save report");
    }
    setBusy(false);
  }

  if (place === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (place === null) return <p>Place not found. <Link href="/explore">Back to explore</Link></p>;

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <>
      <span className="tag">{catEmoji(place.category)} {catLabel(place.category)}</span>
      <h1>{place.title}</h1>
      <p className="muted">{avg ? `★ ${avg} from ${reviews.length} review(s)` : "No reviews yet"}</p>
      <p><button className="chip" onClick={onSave}>{saved ? "★ Saved" : "☆ Save"}</button> <ShareButton title={place.title} /></p>
      <MapLoader height={300} places={[place]} center={[place.lng, place.lat]} zoom={9} />
      <PhotoGallery photos={photos} me={user?.id ?? null} placeId={id} onChange={load} />
      {user && <PhotoUploader placeId={id} onDone={load} />}
      {place.photo_url && <p><img src={place.photo_url} alt={place.title} style={{ maxWidth: "100%", borderRadius: 12 }} /></p>}
      {place.description && <p>{place.description}</p>}
      {place.best_season && <p><strong>Best season:</strong> {place.best_season}</p>}
      {place.how_to_reach && <p><strong>How to reach:</strong> {place.how_to_reach}</p>}
      {place.tips && <p><strong>Tips:</strong> {place.tips}</p>}

      {stats && stats.review_count > 0 && (
        <>
          <h2>What travellers say</h2>
          <div className="dims">
            {([
              ["Natural beauty", stats.avg_beauty, false], ["Accessibility", stats.avg_accessibility, false],
              ["Cleanliness", stats.avg_cleanliness, false], ["Safety", stats.avg_safety, false],
              ["Value for money", stats.avg_value, false], ["Crowd", stats.avg_crowd, true],
            ] as [string, number | null, boolean][]).filter(([, v]) => v != null).map(([label, v, invert]) => (
              <div key={label} className="dim">
                <span>{label}</span>
                <span className="bar"><span style={{ width: `${(Number(v) / 5) * 100}%` }} className={invert ? "warnFill" : ""} /></span>
                <strong>{v}/5</strong>
              </div>
            ))}
          </div>
          <p className="muted"><small>
            Based on {stats.review_count} traveller{stats.review_count === 1 ? "" : "s"}
            {stats.last_visited ? ` · last visited ${stats.last_visited}` : ""}. For crowd, a higher number means busier.
          </small></p>
        </>
      )}

      <h2>Current conditions</h2>
      {conditions.length === 0 && <p className="muted">No recent reports (last 90 days). Been here lately? Let others know below.</p>}
      {conditions.map((c) => (
        <p key={c.id} className="cond">
          <strong>{CONDITION_KINDS.find(([k]) => k === c.kind)?.[1] ?? c.kind}</strong>
          <span className="muted"> · {new Date(c.created_at).toLocaleDateString()} · {c.author ?? "traveller"}</span>
          {c.note && <><br />{c.note}</>}
        </p>
      ))}
      {user && (
        <details className="tips"><summary>Report current conditions</summary>
          <form className="stack" onSubmit={submitCondition}>
            <label>What did you notice?
              <select name="kind" defaultValue="road_damaged">{CONDITION_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <label>Details (optional)<input name="note" maxLength={300} placeholder="e.g. last 2 km is a rough dirt track" /></label>
            <button className="primary" disabled={busy}>Submit report</button>
          </form>
        </details>
      )}

      <h2>Reviews</h2>
      {reviews.map((r) => (
        <div key={r.id} className="review">
          <strong>★ {r.rating}</strong> <span className="muted">by {r.author ?? "traveller"}{r.visited_on ? ` · visited ${r.visited_on}` : ""}</span>
          {r.pros && <p className="pros">+ {r.pros}</p>}
          {r.cons && <p className="cons">− {r.cons}</p>}
          {r.price_paid != null && (
            <p className="muted">Paid {r.currency} {r.price_paid}{r.price_note ? ` (${r.price_note})` : ""}</p>
          )}
          {(r.value_rating || r.safety_rating || r.beauty_rating || r.accessibility_rating || r.cleanliness_rating || r.crowd_rating) && (
            <small className="muted">
              {[["Beauty", r.beauty_rating], ["Access", r.accessibility_rating], ["Clean", r.cleanliness_rating],
                ["Safety", r.safety_rating], ["Value", r.value_rating], ["Crowd", r.crowd_rating]]
                .filter(([, v]) => v != null).map(([k, v]) => `${k} ${v}/5`).join(" · ")}
            </small>
          )}
        </div>
      ))}

      <h3>Write a review</h3>
      {!user ? (
        <p><Link href="/login">Log in</Link> to review.</p>
      ) : (
        <form className="stack" onSubmit={submitReview}>
          <div className="row">
            <label>Overall (1-5)<input name="rating" type="number" min={1} max={5} required /></label>
            <label>Visited on<input name="visited_on" type="date" /></label>
          </div>
          <label>Pros<textarea name="pros" /></label>
          <label>Cons<textarea name="cons" /></label>
          <div className="row">
            <label>Price paid (INR)<input name="price_paid" type="number" min={0} step="any" /></label>
            <label>What was it for?<input name="price_note" placeholder="e.g. auto from station" /></label>
          </div>
          <div className="row">
            <label>Value for money (1-5)<input name="value_rating" type="number" min={1} max={5} /></label>
            <label>Safety (1-5)<input name="safety_rating" type="number" min={1} max={5} /></label>
          </div>
          <div className="row">
            <label>Natural beauty (1-5)<input name="beauty_rating" type="number" min={1} max={5} /></label>
            <label>Accessibility (1-5)<input name="accessibility_rating" type="number" min={1} max={5} /></label>
          </div>
          <div className="row">
            <label>Cleanliness (1-5)<input name="cleanliness_rating" type="number" min={1} max={5} /></label>
            <label>Crowd (1 empty - 5 packed)<input name="crowd_rating" type="number" min={1} max={5} /></label>
          </div>
          <button className="primary" disabled={busy}>{busy ? "Saving…" : "Submit review"}</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
