import { track } from "./analytics";
import { compressImage } from "./image";
import { getSupabase } from "./supabase";

async function call<T>(path: string, body: unknown): Promise<T> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please log in to use AI features.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "The AI request failed. Please try again.");
  return json as T;
}

export type AiSearchResult = { interpretation: string; results: { place_id: string; title: string; category: string; reason: string }[] };
export async function aiSearch(query: string, from: { name: string; lat: number; lng: number } | null): Promise<AiSearchResult> {
  const r = await call<AiSearchResult>("/api/ai/search", { query, from });
  track("ai_search");
  return r;
}

export type ReviewSummary = {
  summary: { headline: string; pros: string[]; cons: string[]; costs: string | null; best_for: string[]; watch_out: string[] };
  basedOn: { reviews: number; reports: number };
};
export async function aiSummary(placeId: string): Promise<ReviewSummary> {
  const key = `yorvia_sum_${placeId}`;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || "null") as { at: number; r: ReviewSummary } | null;
    if (hit && Date.now() - hit.at < 30 * 60_000) return hit.r;
  } catch { /* ignore */ }
  const r = await call<ReviewSummary>("/api/ai/summary", { placeId });
  track("ai_summary");
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), r })); } catch { /* ignore */ }
  return r;
}

export type Identification = {
  not_a_place: boolean; shows: string; tips: string[];
  guesses: { name: string; region: string | null; confidence: "low" | "medium" | "high"; reason: string }[];
};
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => reject(new Error("Could not read the photo."));
    fr.readAsDataURL(blob);
  });
}
/** Shrinks the photo in the browser (also removes its location data) and asks the AI where it might be. */
export async function aiIdentify(file: File): Promise<Identification> {
  const blob = await compressImage(file, 1024, 0.8);
  const r = await call<Identification>("/api/ai/identify", { image: await toBase64(blob) });
  track("photo_identified");
  return r;
}
