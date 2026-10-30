"use client";
import { useEffect, useState } from "react";
import { getMySuspension } from "@/lib/data";
import { useUser } from "@/lib/useUser";

export default function SuspensionBanner() {
  const { user } = useUser();
  const [s, setS] = useState<{ reason: string | null } | null>(null);
  useEffect(() => { if (user) getMySuspension().then(setS).catch(() => {}); else setS(null); }, [user]);
  if (!s) return null;
  return (
    <div className="banner" role="alert" style={{ background: "#fee2e2", color: "#7f1d1d" }}>
      Your account is suspended. You can still browse, but you can't post, comment, message or upload.{s.reason ? ` Reason: ${s.reason}` : ""}
    </div>
  );
}
