"use client";
import { useState } from "react";
import { aiSummary, type ReviewSummary as Summary } from "@/lib/ai";

export default function ReviewSummary({ placeId, reviewCount }: { placeId: string; reviewCount: number }) {
  const [s, setS] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (reviewCount < 3) return null;

  async function go() {
    setBusy(true); setError(null);
    try { setS(await aiSummary(placeId)); } catch (e) { setError(e instanceof Error ? e.message : "Could not summarise"); }
    setBusy(false);
  }

  return (
    <section>
      {!s && <p><button className="chip" onClick={go} disabled={busy}>{busy ? "Summarising…" : `✨ Summarise ${reviewCount} reviews with AI`}</button></p>}
      {error && <p className="error"><small>{error}</small></p>}
      {s && (
        <div className="card">
          <strong>✨ {s.summary.headline}</strong>
          {s.summary.pros.length > 0 && <p className="pros" style={{ margin: "8px 0 0" }}>{s.summary.pros.map((x) => `+ ${x}`).join("  ·  ")}</p>}
          {s.summary.cons.length > 0 && <p className="cons" style={{ margin: "4px 0 0" }}>{s.summary.cons.map((x) => `− ${x}`).join("  ·  ")}</p>}
          {s.summary.costs && <p style={{ margin: "8px 0 0" }}>💰 {s.summary.costs}</p>}
          {s.summary.best_for.length > 0 && <p style={{ margin: "4px 0 0" }}>👍 Good for: {s.summary.best_for.join(", ")}</p>}
          {s.summary.watch_out.length > 0 && <p style={{ margin: "4px 0 0" }}>⚠️ Watch out: {s.summary.watch_out.join(" · ")}</p>}
          <p className="muted" style={{ margin: "8px 0 0" }}><small>AI summary of {s.basedOn.reviews} reviews{s.basedOn.reports ? ` and ${s.basedOn.reports} recent condition reports` : ""}. Read the reviews below for the full picture.</small></p>
        </div>
      )}
    </section>
  );
}
