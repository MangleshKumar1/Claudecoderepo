"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MapLoader from "@/components/MapLoader";
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
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
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
        <label>Tips<textarea name="tips" /></label>
        <button className="primary" disabled={busy}>{busy ? "Saving…" : "Publish pin"}</button>
        {error && <p className="error">{error}{createdId && <> <Link href={`/places/${createdId}`}>Open your pin</Link> to add the photo there.</>}</p>}
      </form>
    </>
  );
}
