"use client";
import { useState } from "react";
import { uploadsEnabled } from "@/lib/media";
import { uploadImage } from "@/lib/upload";
import { LISTING_KINDS, PRICE_UNITS, type Listing, type ListingKind, type PriceUnit } from "@/lib/types";
import type { ListingInput } from "@/lib/data";

export default function ListingForm({ initial, submitLabel, onSubmit }: {
  initial?: Listing; submitLabel: string; onSubmit: (v: ListingInput) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || null;
    setBusy(true); setError(null);
    try {
      let photo_key: string | null | undefined = initial?.photo_key ?? null;
      const file = f.get("photo") as File | null;
      if (uploadsEnabled && file && file.size > 0) photo_key = await uploadImage(file, "listings");
      await onSubmit({
        kind: f.get("kind") as ListingKind, name: text("name")!, description: text("description"), city: text("city"),
        price_from: f.get("price_from") ? Number(f.get("price_from")) : null,
        price_unit: (text("price_unit") as PriceUnit | null), website: text("website"), photo_key,
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save"); }
    setBusy(false);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>Type of business
        <select name="kind" defaultValue={initial?.kind ?? "stay"}>{LISTING_KINDS.map(([k, e, l]) => <option key={k} value={k}>{e} {l}</option>)}</select>
      </label>
      <label>Name<input name="name" required minLength={2} maxLength={100} defaultValue={initial?.name} placeholder="Himalayan View Homestay" /></label>
      <label>City or area<input name="city" maxLength={80} defaultValue={initial?.city ?? ""} placeholder="Manali, Himachal Pradesh" /></label>
      <label>Description<textarea name="description" maxLength={1500} defaultValue={initial?.description ?? ""} placeholder="What you offer, what's included, languages spoken, how to reach you…" /></label>
      <div className="row">
        <label>Starting price (₹, optional)<input name="price_from" type="number" min={0} defaultValue={initial?.price_from ?? undefined} /></label>
        <label>Price is<select name="price_unit" defaultValue={initial?.price_unit ?? ""}><option value="">—</option>{PRICE_UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
      </div>
      <label>Website (optional, must start with https://)<input name="website" type="url" pattern="https://.*" maxLength={200} defaultValue={initial?.website ?? ""} /></label>
      {uploadsEnabled && <label>Photo (optional)<input name="photo" type="file" accept="image/*" /></label>}
      <button className="primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
      {error && <p className="error">{error}</p>}
      <small className="muted">By listing, you confirm the details are accurate and that you operate this business legally. Travellers contact you through YORVIA enquiries. Don't share personal documents or take payments off-platform from strangers without checking who they are.</small>
    </form>
  );
}
