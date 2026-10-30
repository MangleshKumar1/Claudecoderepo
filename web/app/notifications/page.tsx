"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/data";
import { timeAgo } from "@/lib/time";
import type { AppNotification } from "@/lib/types";
import { useUser } from "@/lib/useUser";

const ICON: Record<AppNotification["kind"], string> = {
  enquiry: "📩", enquiry_reply: "💬", join_request: "🙋", join_decision: "🎉", comment: "💬", follow: "👤", rating: "⭐", report_update: "🛡️",
};

export default function Notifications() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { listNotifications().then(setItems).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to see your notifications.</p>;
  const unread = items?.filter((n) => !n.read_at).length ?? 0;

  async function open(n: AppNotification) {
    try { if (!n.read_at) await markNotificationRead(n.id); } catch { /* still navigate */ }
    if (n.link) router.push(n.link); else load();
  }

  return (
    <>
      <h1>🔔 Notifications</h1>
      <p className="muted">Enquiries, join requests, comments, new followers and updates on your reports. We keep the last 60 days. There are no email or push notifications yet, so check here.</p>
      {unread > 0 && <p><button className="chip" onClick={() => markAllNotificationsRead().then(load).catch((e) => setError(e.message))}>Mark all {unread} as read</button></p>}
      {error && <p className="error">{error}</p>}
      {!items && !error && <div className="skeleton" style={{ height: 120 }} />}
      {items?.length === 0 && <EmptyState emoji="🔔" title="You're all caught up" text="When someone enquires, comments, follows you or answers your request, it shows up here." />}
      <div className="feedCol">
        {items?.map((n) => (
          <button key={n.id} className={`card notif ${n.read_at ? "" : "unread"}`} onClick={() => open(n)}>
            <span className="e" aria-hidden="true">{ICON[n.kind]}</span>
            <span>
              <strong>{n.title}</strong>
              {n.body && <span className="muted" style={{ display: "block" }}>{n.body}</span>}
              <small className="muted">{timeAgo(n.created_at)}</small>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
