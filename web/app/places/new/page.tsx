"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MapLoader from "@/components/MapLoader";
import { catEmoji, catLabel } from "@/lib/categories";
import { addPlacePhoto, createPlace } from "@/lib/data";
import { uploadsEnabled } from "@/lib/media";
import { uploadImage } from "@/lib/upload";
import { CATEGORIES, type Category } from "@/lib/types";
import { useUser } from "@/lib/useUser";
import Link from "next/link";

export default function NewPlace() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pos) return setError("Click the map to drop a pin.");
    const f = new FormData(e.currentTarget);
    const val = (k: string) => ((f.get(k) as string) || "").trim() || null;
    const tri = (k: string) => (f.get(k) === "true" ? true : f.get(k) === "false" ? false : null);
    setBusy(true);
    setError(null);
    try {
      const id = await createPlace({
        title: val("title")!,
        description: val("description"),
        category: f.get("category") as Category,
        lat: pos.lat,
        lng: pos.lng,
        best_season: val("best_season"),
        how_to_reach: val("how_to_reach"),
        tips: val("tips"),
        photo_url: val("photo_url"),
        entry_fee: f.get("entry_fee") ? Number(f.get("entry_fee")) : null,
        typical_cost_per_day: f.get("typical_cost_per_day") ? Number(f.get("typical_cost_per_day")) : null,
        parking_fee: f.get("parking_fee") ? Number(f.get("parking_fee")) : null,
        parking: (val("parking") as "free" | "paid" | "none" | null),
        toilet: (val("toilet") as "yes_clean" | "yes_poor" | "no" | null),
        mobile_network: (val("mobile_network") as "none" | "weak" | "good" | null),
        drinking_water: tri("drinking_water"),
        fuel_nearby: tri("fuel_nearby"),
        atm_nearby: tri("atm_nearby"),
        wheelchair_access: tri("wheelchair_access"),
      });
      const photo = f.get("photo") as File | null;
      if (uploadsEnabled && photo && photo.size > 0) {
        try {
          await addPlacePhoto(id, await uploadImage(photo));
        } catch (photoErr) {
          // The pin itself is saved; don't lose it because the photo failed.
          setCreatedId(id);
          setError(`Your pin was saved, but the photo didn't upload: ${photoErr instanceof Error ? photoErr.message : "unknown error"}`);
          setBusy(false);
          return;
        }
      }
      router.push(`/places/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return <p>Please <Link href="/login">log in</Link> to pin a place.</p>;
  }

  return (
    <>
      <h1>Pin a place</h1>
      <p className="muted">Click the map to drop a pin on the exact spot.</p>
      <MapLoader height={360} onPick={(lat, lng) => setPos({ lat, lng })} picked={pos} />
      <p className="muted">{pos ? `Selected: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "No location selected yet"}</p>
      <form className="stack" onSubmit={submit}>
        <label>Title<input name="title" required minLength={2} maxLength={120} /></label>
        <label>Category
          <select name="category" defaultValue="offbeat">
            {CATEGORIES.map((c) => <option key={c} value={c}>{catEmoji(c)} {catLabel(c)}</option>)}
          </select>
        </label>
        <label>Description<textarea name="description" /></label>
        <div className="row">
          <label>Best season<input name="best_season" placeholder="e.g. Oct–Mar" /></label>
          {uploadsEnabled
          ? <label>Photo (optional)<input name="photo" type="file" accept="image/*" /></label>
          : <label>Photo URL (optional)<input name="photo_url" type="url" /></label>}
        </div>
        <label>How to reach<textarea name="how_to_reach" /></label>
        <details className="tips"><summary>Useful details for visitors (optional)</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="row">
              <label>Entry fee (₹, 0 if free)<input name="entry_fee" type="number" min={0} /></label>
              <label>Typical cost per day (₹)<input name="typical_cost_per_day" type="number" min={0} /></label>
            </div>
            <div className="row">
              <label>Parking<select name="parking" defaultValue=""><option value="">Don't know</option><option value="free">Free</option><option value="paid">Paid</option><option value="none">None</option></select></label>
              <label>Parking fee (₹)<input name="parking_fee" type="number" min={0} /></label>
            </div>
            <div className="row">
              <label>Toilet<select name="toilet" defaultValue=""><option value="">Don't know</option><option value="yes_clean">Yes, clean</option><option value="yes_poor">Yes, poor condition</option><option value="no">None</option></select></label>
              <label>Mobile network<select name="mobile_network" defaultValue=""><option value="">Don't know</option><option value="good">Good</option><option value="weak">Weak</option><option value="none">None</option></select></label>
            </div>
            <div className="row">
              <label>Drinking water<select name="drinking_water" defaultValue=""><option value="">Don't know</option><option value="true">Available</option><option value="false">Not available</option></select></label>
              <label>Fuel nearby<select name="fuel_nearby" defaultValue=""><option value="">Don't know</option><option value="true">Yes</option><option value="false">No</option></select></label>
            </div>
            <div className="row">
              <label>ATM nearby<select name="atm_nearby" defaultValue=""><option value="">Don't know</option><option value="true">Yes</option><option value="false">No</option></select></label>
              <label>Wheelchair accessible<select name="wheelchair_access" defaultValue=""><option value="">Don't know</option><option value="true">Yes</option><option value="false">No</option></select></label>
            </div>
          </div>
        </details>
        <label>Tips<textarea name="tips" /></label>
        <button className="primary" disabled={busy}>{busy ? "Saving…" : "Publish pin"}</button>
        {error && <p className="error">{error}{createdId && <> <Link href={`/places/${createdId}`}>Open your pin</Link> to add the photo there.</>}</p>}
      </form>
    </>
  );
}
