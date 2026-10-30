"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { CardSkeletons } from "@/components/Skeletons";
import { createCollection, listCollections } from "@/lib/data";
import type { Collection } from "@/lib/types";
import { useUser } from "@/lib/useUser";

function CollectionCard({ c }: { c: Collection }) {
  return (
    <Link href={`/collections/${c.id}`} className="card">
      <span className="tag">{c.place_count} place{c.place_count === 1 ? "" : "s"}</span>{" "}
      {!c.is_public && <span className="badge">Private</span>}
      <h3>🗂️ {c.title}</h3>
      {c.description && <p>{c.description.slice(0, 100)}</p>}
      {c.owner_name && <small className="muted">by {c.owner_name}</small>}
    </Link>
  );
}

export default function Collections() {
  const router = useRouter();
  const { user } = useUser();
  const [pub, setPub] = useState<Collection[] | null>(null);
  const [mine, setMine] = useState<Collection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listCollections().then(setPub).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (user) listCollections({ mine: true }).then(setMine).catch((e) => setError(e.message)); }, [user]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const id = await createCollection((f.get("title") as string).trim(), ((f.get("description") as string) || "").trim() || null, f.get("public") === "on");
      router.push(`/collections/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create"); setBusy(false); }
  }

  const mineIds = new Set(mine.map((m) => m.id));
  return (
    <>
      <h1>Collections</h1>
      <p className="muted">Curated lists of places, like "20 best waterfalls in India" or "Weekend trips from Delhi". Share them with your followers.</p>
      {user && (
        <details className="tips"><summary>+ New collection</summary>
          <form className="stack" onSubmit={create}>
            <label>Title<input name="title" required minLength={2} maxLength={80} placeholder="Best waterfalls in the Western Ghats" /></label>
            <label>Description (optional)<textarea name="description" maxLength={400} /></label>
            <label className="check"><input name="public" type="checkbox" defaultChecked /> Public (anyone can see it)</label>
            <button className="primary" disabled={busy}>Create collection</button>
          </form>
        </details>
      )}
      {error && <p className="error">{error}</p>}
      {user && (
        <>
          <h2>Yours</h2>
          {mine.length === 0 ? <EmptyState emoji="🗂️" title="No collections yet" text="Create one, then add places from any place page." /> : <div className="grid">{mine.map((c) => <CollectionCard key={c.id} c={c} />)}</div>}
        </>
      )}
      <h2>From the community</h2>
      {!pub && !error && <CardSkeletons n={3} />}
      {pub && pub.filter((c) => !mineIds.has(c.id)).length === 0 && <EmptyState emoji="🌍" title="Nothing public yet" text="Be the first to share a collection." />}
      <div className="grid">{pub?.filter((c) => !mineIds.has(c.id)).map((c) => <CollectionCard key={c.id} c={c} />)}</div>
    </>
  );
}
