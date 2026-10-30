"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function ShareButton({ title, label = "Share", path }: { title: string; label?: string; path?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      track("invite_shared", { kind: window.location.pathname.split("/")[1] || "home" });
    } catch {
      /* user cancelled the share sheet */
    }
  }

  return <button className="chip" onClick={share}>{copied ? "Link copied ✓" : `↗ ${label}`}</button>;
}
