"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import MapLoader from "@/components/MapLoader";
import PlaceCard from "@/components/PlaceCard";
import ShareButton from "@/components/ShareButton";
import {
  addToCollection, deleteCollection, getCollection, listCollectionPlaces, listPlaces, removeFromCollection, updateCollection,
} from "@/lib/data";
import type { Collection, Place } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [c, setC] = useState<Collection | null | undefined>(undefined);
  const [places, setPlaces] = useState<Place[]>([]);
  const [all, setAll] = useState<Place[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setC(await getCollection(id));
      setPlaces(await listCollectionPlaces(id));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listPlaces().then(setAll).catch(() => {}); }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  if (c === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (c === null) return <p>Collection not found, or it's private. <Link href="/collections">Back</Link></p>;
  const isOwner = user?.id === c.user_id;
  const inIds = new Set(places.map((p) => p.id));

  return (
    <>
      <span className="badge">{c.is_public ? "Public" : "Private"}</span>
      <h1>🗂️ {c.title}</h1>
      <p className="muted">by <Link href={`/profile/${c.user_id}`}>{c.owner_name ?? "a traveller"}</Link> · {places.length} place{places.length === 1 ? "" : "s"}</p>
      {c.description && <p>{c.description}</p>}
      <p>{c.is_public && <ShareButton title={c.title} label="Share collection" />}</p>
      {places.length > 0 && <MapLoader height={300} places={places} center={[places[0].lng, places[0].lat]} zoom={places.length > 1 ? 4 : 9} />}
      {places.length === 0 && <EmptyState emoji="📍" title="No places yet" text={isOwner ? "Add some below, or from any place page." : "The curator hasn't added any places yet."} />}
      <div className="grid">
        {places.map((p) => (
          <div key={p.id}>
            <PlaceCard place={p} />
            {isOwner && <button className="link error" disabled={busy} onClick={() => run(() => removeFromCollection(id, p.id))}><small>remove from collection</small></button>}
          </div>
        ))}
      </div>
      {isOwner && (
        <>
          <h2>Add a place</h2>
          <div className="composerRow" style={{ maxWidth: 520 }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Choose a place">
              <option value="">Choose a place…</option>
              {all.filter((p) => !inIds.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button className="primary" disabled={busy || !pick} onClick={() => run(async () => { await addToCollection(id, pick); setPick(""); })}>Add</button>
          </div>
          <h2>Settings</h2>
          <p>
            <button className="chip" disabled={busy} onClick={() => run(() => updateCollection(id, { is_public: !c.is_public }))}>{c.is_public ? "Make private" : "Make public"}</button>{" "}
            <button className="link error" disabled={busy} onClick={() => { if (confirm("Delete this collection? The places themselves are not deleted.")) run(async () => { await deleteCollection(id); router.push("/collections"); }); }}>Delete collection</button>
          </p>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
