"use client";
import Link from "next/link";
import { useState } from "react";
import { aiSearch, type AiSearchResult } from "@/lib/ai";
import { catEmoji, catLabel } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { useUser } from "@/lib/useUser";

const EXAMPLES = ["Peaceful places near Delhi under ₹2,000 a day", "A waterfall with good parking and few crowds", "Cheap beach for a weekend"];

export default function AiSearch() {
  const { user } = useUser();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AiSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(text: string) {
    setBusy(true); setError(null); setRes(null);
    try {
      const c = CITIES.find((x) => x.name === city);
      setRes(await aiSearch(text, c ? { name: c.name, lat: c.lat, lng: c.lng } : null));
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed"); }
    setBusy(false);
  }

  return (
    <details className="tips aiBox">
      <summary>✨ Ask in your own words (AI)</summary>
      {!user ? <p className="muted"><Link href="/login">Log in</Link> to search with AI.</p> : (
        <>
          <form className="searchbar" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 3) run(q.trim()); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. quiet places near Delhi with few tourists" maxLength={300} aria-label="Describe the place you want" />
            <button className="btn" disabled={busy || q.trim().length < 3}>{busy ? "Thinking…" : "Ask"}</button>
          </form>
          <div className="filters">
            <label className="check" style={{ gap: 6 }}>Near <select value={city} onChange={(e) => setCity(e.target.value)}><option value="">anywhere</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
            {EXAMPLES.map((x) => <button key={x} type="button" className="chip" onClick={() => { setQ(x); run(x); }} disabled={busy}>{x}</button>)}
          </div>
          {error && <p className="error">{error}</p>}
          {res && (
            <div>
              <p className="muted"><small>We understood: {res.interpretation}</small></p>
              {res.results.length === 0 && <p>No pinned places match yet. Try different words, or pin one you know.</p>}
              {res.results.map((r) => (
                <div key={r.place_id} className="review">
                  <Link href={`/places/${r.place_id}`}><strong>{catEmoji(r.category)} {r.title}</strong></Link> <span className="tag">{catLabel(r.category)}</span>
                  <div className="muted">{r.reason}</div>
                </div>
              ))}
              <p className="muted"><small>AI picks from places travellers have pinned. It can be wrong, so check each place's reviews and conditions.</small></p>
            </div>
          )}
        </>
      )}
    </details>
  );
}
