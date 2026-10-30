"use client";
import { useCallback, useEffect, useState } from "react";
import {
  addPollOption, castVote, createPoll, deletePoll, listPolls, setPollStatus, withdrawVote,
} from "@/lib/data";
import { POLL_KINDS, type Poll, type PollKind } from "@/lib/types";

export default function TripPolls({ tripId, me, isOwner }: { tripId: string; me: string; isOwner: boolean }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listPolls(tripId).then(setPolls).catch((e) => setError(e.message));
  }, [tripId]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    const labels = ((f.get("options") as string) || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (labels.length < 2) return setError("Add at least two options, one per line.");
    await run(async () => {
      await createPoll(tripId, (f.get("question") as string).trim(), f.get("kind") as PollKind, labels);
      form.reset();
    });
  }

  return (
    <>
      <h2>Group polls</h2>
      <p className="muted">Can't agree? Put it to a vote. Everyone on this trip can vote. Votes are visible to the group.</p>

      {polls.map((p) => {
        const total = p.votes.length;
        const myVote = p.votes.find((v) => v.user_id === me)?.option_id;
        const counts = p.options.map((o) => ({ o, n: p.votes.filter((v) => v.option_id === o.id).length }));
        const top = Math.max(0, ...counts.map((c) => c.n));
        const winners = counts.filter((c) => c.n === top && top > 0);
        const open = p.status === "open";
        const canManage = p.created_by === me || isOwner;
        return (
          <div key={p.id} className="review">
            <strong>{p.question}</strong>{" "}
            <span className="tag">{POLL_KINDS.find(([k]) => k === p.kind)?.[1] ?? p.kind}</span>{" "}
            <span className={`badge ${open ? "good" : ""}`}>{open ? "Open" : "Closed"}</span>
            {counts.map(({ o, n }) => {
              const voters = p.votes.filter((v) => v.option_id === o.id).map((v) => (v.user_id === me ? "You" : v.voter ?? "Traveller"));
              return (
                <div key={o.id} className="pollRow">
                  <label className="pollChoice">
                    <input type="radio" name={`poll-${p.id}`} checked={myVote === o.id} disabled={busy || !open}
                      onChange={() => run(() => castVote(p.id, o.id))} />
                    <span>{o.label}{!open && winners.some((w) => w.o.id === o.id) ? " 🏆" : ""}</span>
                    <strong>{n}</strong>
                  </label>
                  <span className="bar"><span style={{ width: total ? `${(n / total) * 100}%` : 0 }} /></span>
                  {voters.length > 0 && <small className="muted">{voters.join(", ")}</small>}
                </div>
              );
            })}
            <small className="muted">
              {total} vote{total === 1 ? "" : "s"}
              {!open && winners.length > 0 && ` · ${winners.length === 1 ? `Decided: ${winners[0].o.label}` : "Tie: " + winners.map((w) => w.o.label).join(" / ")}`}
            </small>
            <div>
              {open && myVote && <button className="link" disabled={busy} onClick={() => run(() => withdrawVote(p.id))}>remove my vote</button>}
              {open && (
                <details className="tips" style={{ margin: "6px 0" }}><summary>+ Suggest another option</summary>
                  <form className="stack" onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const label = ((new FormData(form).get("label") as string) || "").trim();
                    if (label) run(async () => { await addPollOption(p.id, label); form.reset(); });
                  }}>
                    <label>Option<input name="label" maxLength={100} required /></label>
                    <button className="primary" disabled={busy}>Add option</button>
                  </form>
                </details>
              )}
              {canManage && (
                <small>
                  <button className="link" disabled={busy} onClick={() => run(() => setPollStatus(p.id, open ? "closed" : "open"))}>{open ? "close poll" : "reopen poll"}</button>{" "}
                  <button className="link error" disabled={busy} onClick={() => { if (confirm("Delete this poll and its votes?")) run(() => deletePoll(p.id)); }}>delete</button>
                </small>
              )}
            </div>
          </div>
        );
      })}

      <details className="tips"><summary>+ Start a poll</summary>
        <form className="stack" onSubmit={onCreate}>
          <label>Question<input name="question" required minLength={3} maxLength={160} placeholder="Where should we stay in Manali?" /></label>
          <label>About
            <select name="kind" defaultValue="destination">{POLL_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label>Options (one per line, 2 to 10)
            <textarea name="options" required rows={4} placeholder={"Old Manali hostel\nMall Road hotel\nHomestay near Naggar"} />
          </label>
          <button className="primary" disabled={busy}>Create poll</button>
        </form>
      </details>
      {error && <p className="error">{error}</p>}
    </>
  );
}
