"use client";
import { useEffect, useState } from "react";
import { addToCollection, createCollection, listCollections } from "@/lib/data";
import type { Collection } from "@/lib/types";

export default function AddToCollection({ placeId }: { placeId: string }) {
  const [mine, setMine] = useState<Collection[]>([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { listCollections({ mine: true }).then(setMine).catch(() => {}); }, []);

  async function add() {
    setBusy(true);
    setMsg(null);
    try {
      let target = pick;
      if (target === "__new") {
        const title = prompt("Name your new collection:")?.trim();
        if (!title) { setBusy(false); return; }
        target = await createCollection(title, null, true);
        setMine(await listCollections({ mine: true }));
      }
      await addToCollection(target, placeId);
      setMsg({ text: "Added to your collection ✓", ok: true });
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Could not add", ok: false }); }
    setBusy(false);
  }

  return (
    <details className="tips"><summary>🗂️ Add to a collection</summary>
      <div className="composerRow">
        <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Choose a collection">
          <option value="">Choose…</option>
          {mine.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          <option value="__new">+ New collection…</option>
        </select>
        <button className="primary" disabled={busy || !pick} onClick={add}>Add</button>
      </div>
      {msg && <p className={msg.ok ? "ok" : "error"}><small>{msg.text}</small></p>}
    </details>
  );
}
