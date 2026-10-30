"use client";
import { useEffect, useRef, useState } from "react";
import { createPost, listPlaces } from "@/lib/data";
import { uploadsEnabled } from "@/lib/media";
import type { Place } from "@/lib/types";

export default function PostComposer({ onPosted }: { onPosted: () => void }) {
  const [text, setText] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { listPlaces().then(setPlaces).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPost(text.trim(), placeId || null, files);
      setText(""); setPlaceId(""); setFiles([]);
      if (input.current) input.current.value = "";
      onPosted();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not post"); }
    setBusy(false);
  }

  return (
    <form className="card composer" onSubmit={submit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Share a place, a tip, a story from your trip…" aria-label="Write a post" />
      <div className="composerRow">
        <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} aria-label="Tag a place">
          <option value="">📍 Tag a place (optional)</option>
          {places.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {uploadsEnabled && (
          <label className="chip" style={{ cursor: "pointer" }}>
            📷 {files.length ? `${files.length} photo${files.length === 1 ? "" : "s"}` : "Photos"}
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))} />
          </label>
        )}
        <button className="primary" disabled={busy || !text.trim()}>{busy ? "Posting…" : "Post"}</button>
      </div>
      {error && <p className="error"><small>{error}</small></p>}
      <small className="muted">Only share photos you took. Location data is removed from photos. Up to 4 photos.</small>
    </form>
  );
}
