"use client";
import { useState } from "react";
import { reportUser } from "@/lib/data";
import { REPORT_REASONS, type ReportReason } from "@/lib/types";
import { useUser } from "@/lib/useUser";

type Props = { targetUserId: string; tripId?: string; messageId?: string; label?: string };

export default function ReportButton({ targetUserId, tripId, messageId, label = "Report" }: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user || user.id === targetUserId) return null;
  if (state === "done") return <small className="ok">Report sent. Thank you.</small>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      await reportUser({ target_user_id: targetUserId, reason, details: details.trim() || null, trip_id: tripId, message_id: messageId });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send report");
      setState("idle");
    }
  }

  if (!open) return <button className="link reportLink" onClick={() => setOpen(true)}>{label}</button>;

  return (
    <form className="reportForm stack" onSubmit={submit}>
      <label>What happened?
        <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          {REPORT_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>Details (optional)
        <textarea value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} />
      </label>
      <div>
        <button className="primary" disabled={state === "busy"}>Send report</button>{" "}
        <button type="button" className="link" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <small className="muted">If you're in immediate danger, contact local emergency services first (India: 112).</small>
      {error && <small className="error">{error}</small>}
    </form>
  );
}
