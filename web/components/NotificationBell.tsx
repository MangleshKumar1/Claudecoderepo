"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { unreadNotificationCount } from "@/lib/data";
import { useUser } from "@/lib/useUser";

export default function NotificationBell() {
  const { user } = useUser();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!user) { setN(0); return; }
    let live = true;
    const refresh = () => unreadNotificationCount().then((c) => { if (live) setN(c); }).catch(() => {});
    refresh();
    const t = setInterval(refresh, 60_000); // checks once a minute, and when you come back to the tab
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { live = false; clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [user]);

  if (!user) return null;
  return (
    <Link href="/notifications" className="chip bell" aria-label={n ? `${n} unread notifications` : "Notifications"}>
      🔔{n > 0 && <span className="dot">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}
