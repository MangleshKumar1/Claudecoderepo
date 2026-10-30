"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import {
  adminListReports, adminMetrics, adminSetListing, adminSetReportStatus, listListings, type AdminMetrics, type AdminReport,
} from "@/lib/data";
import type { Listing } from "@/lib/types";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useUser } from "@/lib/useUser";

const REASONS: Record<string, string> = {
  harassment: "Harassment or abuse", scam: "Scam or fraud", fake_profile: "Fake profile", unsafe_behavior: "Unsafe behaviour",
  inappropriate_content: "Inappropriate content", other: "Other",
};
const STATUSES: AdminReport["status"][] = ["open", "reviewing", "actioned", "dismissed"];

export default function Admin() {
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<"overview" | "reports" | "listings">("overview");
  const [filter, setFilter] = useState<AdminReport["status"] | "all">("open");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "overview") setMetrics(await adminMetrics());
      if (tab === "reports") setReports(await adminListReports(filter));
      if (tab === "listings") setListings(await listListings({ kind: "all", includeHidden: true }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load"); }
  }, [tab, filter]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <p>Please <Link href="/login">log in</Link>.</p>;
  if (!isAdmin) return <p>This page is for YORVIA admins. If that's you, see "Becoming an admin" in the README.</p>;

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } setBusy(false); };
  const v = metrics?.validation;

  return (
    <>
      <h1>🛡️ Admin</h1>
      <div className="filters">
        {(["overview", "reports", "listings"] as const).map((t) => <button key={t} className={`chip ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {error && <p className="error">{error}</p>}

      {tab === "overview" && (
        !metrics ? <p className="muted">Loading…</p> : (
          <>
            <div className="grid stats">
              <div className="card"><h3>{metrics.open_reports}</h3><small>open reports</small></div>
              <div className="card"><h3>{metrics.listings}</h3><small>business listings ({metrics.unverified_listings} unverified)</small></div>
              <div className="card"><h3>{v?.people_seen ?? 0}</h3><small>people seen</small></div>
              <div className="card"><h3>{v?.contributors ?? 0}</h3><small>contributors</small></div>
              <div className="card"><h3>{v?.places_submitted ?? 0}</h3><small>places pinned</small></div>
              <div className="card"><h3>{v?.people_who_saved ?? 0}</h3><small>people who saved a place</small></div>
              <div className="card"><h3>{v?.people_who_shared ?? 0}</h3><small>people who shared</small></div>
              <div className="card"><h3>{v?.returned_within_7d_pct != null ? `${v.returned_within_7d_pct}%` : "–"}</h3><small>returned within 7 days (of {v?.cohort_size ?? 0})</small></div>
            </div>
            <p className="muted"><small>Targets to aim for are in docs/PRODUCT_STRATEGY.md. The return rate only counts people first seen at least 8 days ago.</small></p>
            <h2>Daily active people (last 14 days)</h2>
            {metrics.daily.length === 0 ? <p className="muted">No activity recorded yet.</p> : (
              <div className="dims">{metrics.daily.map((d) => (
                <div key={d.day} className="dim" style={{ gridTemplateColumns: "90px 1fr 40px" }}>
                  <span>{new Date(d.day).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                  <span className="bar"><span style={{ width: `${Math.min(100, (d.active_people / Math.max(1, ...metrics.daily.map((x) => x.active_people))) * 100)}%` }} /></span>
                  <strong>{d.active_people}</strong>
                </div>
              ))}</div>
            )}
          </>
        )
      )}

      {tab === "reports" && (
        <>
          <div className="filters">
            {(["open", "reviewing", "actioned", "dismissed", "all"] as const).map((s) => <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>)}
          </div>
          {!reports ? <p className="muted">Loading…</p> : reports.length === 0 ? <p className="muted">No {filter === "all" ? "" : filter} reports.</p> : reports.map((r) => (
            <div key={r.id} className="review">
              <span className="badge warn">{REASONS[r.reason] ?? r.reason}</span> <span className="badge">{r.status}</span>{" "}
              <small className="muted">{new Date(r.created_at).toLocaleString()}</small>
              <p style={{ margin: "6px 0" }}>
                <Link href={`/profile/${r.reporter_id}`}>{r.reporter_name ?? "Someone"}</Link> reported <Link href={`/profile/${r.target_user_id}`}><strong>{r.target_name ?? "a user"}</strong></Link>
                {r.trip_id && <> · <Link href={`/trips/${r.trip_id}`}>trip</Link></>}
              </p>
              {r.details && <p className="muted" style={{ margin: "0 0 6px", whiteSpace: "pre-wrap" }}>{r.details}</p>}
              <div className="filters" style={{ margin: 0 }}>
                {STATUSES.filter((s) => s !== r.status).map((s) => <button key={s} className="chip" disabled={busy} onClick={() => run(() => adminSetReportStatus(r.id, s))}>Mark {s}</button>)}
              </div>
            </div>
          ))}
          <p className="muted"><small>Open the person's profile to review their posts and listings. As admin you'll see a "remove" button on posts and photos. To suspend an account, use the Supabase dashboard (Authentication → Users).</small></p>
        </>
      )}

      {tab === "listings" && (
        <>
          <p className="muted">All listings, including hidden ones. Verify a listing once you have checked the business yourself (see the README for a suggested checklist).</p>
          {!listings ? <p className="muted">Loading…</p> : <div className="grid">{listings.map((l) => (
            <div key={l.id}>
              <ListingCard l={l} />
              <div className="filters" style={{ margin: "6px 0 0" }}>
                <button className="chip" disabled={busy} onClick={() => run(() => adminSetListing(l.id, !l.verified, l.hidden_by_admin))}>{l.verified ? "Unverify" : "✓ Verify"}</button>
                <button className="chip" disabled={busy} onClick={() => run(() => adminSetListing(l.id, l.verified, !l.hidden_by_admin))}>{l.hidden_by_admin ? "Unhide" : "Hide"}</button>
              </div>
            </div>
          ))}</div>}
        </>
      )}
    </>
  );
}
