import { getSupabase } from "./supabase";

export type EventName =
  | "page_view" | "place_created" | "place_saved" | "review_created" | "condition_reported"
  | "trip_created" | "join_requested" | "itinerary_created" | "ai_plan_generated" | "expense_added"
  | "invite_shared" | "route_search" | "report_filed" | "photo_uploaded";

const ANON_KEY = "tm_anon_id";

function anonId(): string | null {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null; // storage blocked: still fine, we just can't link visits
  }
}

function optedOut(): boolean {
  return typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
}

/**
 * Fire-and-forget product analytics stored in our own database (see events table).
 * Never throws and never blocks the UI. Respects Do Not Track / Global Privacy Control.
 * Don't put personal data in `props`.
 */
export function track(name: EventName, props: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined" || optedOut()) return;
  const sb = getSupabase();
  if (!sb) return;
  void (async () => {
    try {
      const { data } = await sb.auth.getSession();
      await sb.from("events").insert({
        name,
        user_id: data.session?.user.id ?? null,
        anon_id: anonId(),
        path: window.location.pathname.slice(0, 200),
        props,
      });
    } catch {
      /* analytics must never break the app */
    }
  })();
}
