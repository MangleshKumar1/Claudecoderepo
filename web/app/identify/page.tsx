"use client";
import Link from "next/link";
import { useState } from "react";
import { aiIdentify, type Identification } from "@/lib/ai";
import { useUser } from "@/lib/useUser";

const CONF = { high: "Likely", medium: "Possible", low: "Just a guess" } as const;

export default function Identify() {
  const { user, loading } = useUser();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Identification | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null); setRes(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    try { setRes(await aiIdentify(file)); } catch (err) { setError(err instanceof Error ? err.message : "Could not analyse the photo"); }
    e.target.value = "";
    setBusy(false);
  }

  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to use photo recognition.</p>;
  return (
    <>
      <h1>📸 What place is this?</h1>
      <p className="muted">Upload a photo of a landmark or scenery and the AI will suggest where it might be. It doesn't identify people, and it can be wrong.</p>
      <p>
        <label className="btn lg" style={{ cursor: busy ? "wait" : "pointer", display: "inline-flex" }}>
          {busy ? "Analysing…" : "Choose or take a photo"}
          <input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={onPick} />
        </label>
      </p>
      <small className="muted">Your photo is shrunk on your device (location data removed) and sent for analysis. It isn't saved on YORVIA.</small>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <p><img src={preview} alt="Your photo" style={{ maxWidth: 360, borderRadius: 14 }} /></p>
      )}
      {error && <p className="error">{error}</p>}
      {res && (
        <div className="card" style={{ maxWidth: 640 }}>
          <p style={{ marginTop: 0 }}>{res.shows}</p>
          {res.not_a_place ? <p className="muted">This doesn't look like a place or landmark, so there's nothing to identify.</p> : (
            <>
              {res.guesses.map((g, i) => (
                <div key={i} className="review">
                  <strong>{g.name}</strong>{g.region && <span className="muted"> · {g.region}</span>} <span className={`badge ${g.confidence === "high" ? "good" : g.confidence === "low" ? "warn" : ""}`}>{CONF[g.confidence]}</span>
                  <div className="muted">{g.reason}</div>
                  <Link href={`/explore?q=${encodeURIComponent(g.name)}`}>Search YORVIA for this →</Link>
                </div>
              ))}
              {res.tips.length > 0 && <><strong>Tips</strong><ul>{res.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
            </>
          )}
          <p className="muted"><small>AI guesses can be wrong. Confirm the place before you plan a trip around it.</small></p>
        </div>
      )}
    </>
  );
}
