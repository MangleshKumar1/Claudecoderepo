"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ListingForm from "@/components/ListingForm";
import { kindMeta } from "@/components/ListingCard";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import {
  adminSetListing, deleteListing, getListing, listEnquiriesFor, replyToEnquiry, sendEnquiry, updateListing,
} from "@/lib/data";
import { mediaUrl, uploadsEnabled } from "@/lib/media";
import type { Enquiry, Listing } from "@/lib/types";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useUser } from "@/lib/useUser";

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = useIsAdmin();
  const [l, setL] = useState<Listing | null | undefined>(undefined);
  const [enq, setEnq] = useState<Enquiry[]>([]);
  const [editing, setEditing] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const x = await getListing(id);
      setL(x);
      if (x && user?.id === x.owner_id) setEnq(await listEnquiriesFor(id));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
  }, [id, user?.id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  if (l === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (l === null) return <p>Listing not found, or it's hidden. <Link href="/directory">Back to the directory</Link></p>;
  const isOwner = user?.id === l.owner_id;
  const [, emoji, label] = kindMeta(l.kind);

  async function onEnquire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    await run(async () => {
      await sendEnquiry({
        listing_id: id, message: (f.get("message") as string).trim(), contact: (f.get("contact") as string).trim(),
        start_date: (f.get("start") as string) || null, end_date: (f.get("end") as string) || null,
        people: f.get("people") ? Number(f.get("people")) : null,
      });
      form.reset(); setSent(true);
    });
  }

  return (
    <>
      {l.photo_key && uploadsEnabled && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(l.photo_key)} alt="" style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 16 }} />
      )}
      <p style={{ margin: "12px 0 0" }}>
        <span className="tag">{emoji} {label}</span>{" "}
        {l.verified && <span className="badge good" title="Checked by the YORVIA team">✓ Verified</span>}{" "}
        {l.status === "hidden" && <span className="badge warn">Hidden (only you can see it)</span>}{" "}
        {l.hidden_by_admin && <span className="badge warn">Hidden by moderators</span>}
      </p>
      <h1>{l.name}</h1>
      <p className="muted">
        {l.city && <>📍 {l.city} · </>}{l.price_from != null ? `From ₹${l.price_from.toLocaleString("en-IN")} ${l.price_unit ?? ""}` : "Ask for prices"}
        {" · "}by <Link href={`/profile/${l.owner_id}`}>{l.owner_name ?? "the owner"}</Link>
      </p>
      {l.description && <p style={{ whiteSpace: "pre-wrap" }}>{l.description}</p>}
      <p>
        {l.website && <a className="chip" href={l.website} target="_blank" rel="noopener noreferrer nofollow">🌐 Website ↗</a>}{" "}
        <ShareButton title={l.name} />{" "}
        {!isOwner && <ReportButton targetUserId={l.owner_id} label="Report this business" />}
      </p>

      {isAdmin && (
        <div className="alert warn">
          <strong>Admin:</strong>{" "}
          <button className="chip" disabled={busy} onClick={() => run(() => adminSetListing(id, !l.verified, l.hidden_by_admin))}>{l.verified ? "Remove verified badge" : "Mark as verified"}</button>{" "}
          <button className="chip" disabled={busy} onClick={() => run(() => adminSetListing(id, l.verified, !l.hidden_by_admin))}>{l.hidden_by_admin ? "Unhide listing" : "Hide listing"}</button>
        </div>
      )}

      {!isOwner && (
        <>
          <h2>Send an enquiry</h2>
          {!user ? <p><Link href="/login">Log in</Link> to contact this business.</p> : sent ? (
            <p className="ok">Enquiry sent ✓ The business will reply to you. Track replies in <Link href="/directory/mine">My enquiries</Link>.</p>
          ) : (
            <form className="stack" onSubmit={onEnquire}>
              <label>Your message<textarea name="message" required minLength={5} maxLength={1000} placeholder="Hi, do you have availability for 2 people from 14 to 17 Nov? What's included?" /></label>
              <label>How should they reach you? (shared only with this business)<input name="contact" required minLength={3} maxLength={120} placeholder="Phone or email" /></label>
              <div className="row">
                <label>From<input name="start" type="date" /></label>
                <label>To<input name="end" type="date" /></label>
              </div>
              <label>Number of people<input name="people" type="number" min={1} max={100} /></label>
              <button className="primary" disabled={busy}>Send enquiry</button>
              <small className="muted">Your contact details go only to this business. No payment is taken here. Agree on prices and bookings with them directly and be careful about advance payments.</small>
            </form>
          )}
        </>
      )}

      {isOwner && (
        <>
          <h2>Your panel</h2>
          <p>
            <button className="chip" onClick={() => setEditing(!editing)}>{editing ? "Close editor" : "✏️ Edit listing"}</button>{" "}
            <button className="chip" disabled={busy} onClick={() => run(() => updateListing(id, { status: l.status === "active" ? "hidden" : "active" }))}>{l.status === "active" ? "Hide listing" : "Show listing"}</button>{" "}
            <button className="link error" disabled={busy} onClick={() => { if (confirm("Delete this listing and its enquiries?")) run(async () => { await deleteListing(id); router.push("/directory/mine"); }); }}>Delete</button>
          </p>
          {editing && <ListingForm initial={l} submitLabel="Save changes" onSubmit={async (v) => { await updateListing(id, v); setEditing(false); await load(); }} />}

          <h3>Enquiries ({enq.length})</h3>
          {enq.length === 0 && <p className="muted">No enquiries yet.</p>}
          {enq.map((x) => (
            <div key={x.id} className="review">
              <strong>{x.traveller ?? "A traveller"}</strong> <span className={`badge ${x.status === "new" ? "warn" : "good"}`}>{x.status}</span>{" "}
              <small className="muted">{new Date(x.created_at).toLocaleDateString()}</small>
              <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{x.message}</p>
              <small className="muted">📞 {x.contact}{x.people ? ` · ${x.people} people` : ""}{x.start_date ? ` · ${x.start_date}${x.end_date ? ` to ${x.end_date}` : ""}` : ""}</small>
              {x.owner_reply && <p className="ok" style={{ margin: "6px 0 0" }}>Your reply: {x.owner_reply}</p>}
              {x.status !== "closed" && (
                <form className="stack" style={{ marginTop: 8 }} onSubmit={(e) => {
                  e.preventDefault();
                  const reply = ((new FormData(e.currentTarget).get("reply") as string) || "").trim();
                  if (reply) run(() => replyToEnquiry(x.id, reply, "replied"));
                }}>
                  <label>Reply<input name="reply" maxLength={1000} placeholder="Write a reply they'll see in their enquiries" /></label>
                  <div><button className="primary" disabled={busy}>Send reply</button>{" "}<button type="button" className="link" disabled={busy} onClick={() => run(() => replyToEnquiry(x.id, x.owner_reply, "closed"))}>mark closed</button></div>
                </form>
              )}
            </div>
          ))}
          <p className="muted"><small>You'll see new enquiries here. There are no email notifications yet, so check this page regularly.</small></p>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </>
  );
}
