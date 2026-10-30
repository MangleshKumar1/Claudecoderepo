import { getSupabase, isConfigured } from "./supabase";
import { SAMPLE_PLACES, SAMPLE_REVIEWS } from "./sample";
import type { Category, Place, Review } from "./types";

type Stats = { place_id: string; avg_rating: number | null; review_count: number };

export async function listPlaces(category?: Category | "all"): Promise<Place[]> {
  const sb = getSupabase();
  if (!sb) {
    return SAMPLE_PLACES.filter((p) => !category || category === "all" || p.category === category);
  }
  let q = sb.from("places").select("*").order("created_at", { ascending: false }).limit(200);
  if (category && category !== "all") q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  const places = (data ?? []) as Place[];
  if (places.length === 0) return places;
  const { data: stats } = await sb.from("place_stats").select("*").in("place_id", places.map((p) => p.id));
  const byId = new Map((stats as Stats[] | null)?.map((s) => [s.place_id, s]));
  return places.map((p) => ({
    ...p,
    avg_rating: byId.get(p.id)?.avg_rating ?? null,
    review_count: byId.get(p.id)?.review_count ?? 0,
  }));
}

export async function getPlace(id: string): Promise<Place | null> {
  const sb = getSupabase();
  if (!sb) return SAMPLE_PLACES.find((p) => p.id === id) ?? null;
  const { data, error } = await sb.from("places").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Place | null) ?? null;
}

export async function listReviews(placeId: string): Promise<Review[]> {
  const sb = getSupabase();
  if (!sb) return SAMPLE_REVIEWS.filter((r) => r.place_id === placeId);
  const { data, error } = await sb
    .from("reviews")
    .select("*, profiles(display_name)")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as Review),
    author: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export type NewPlace = Omit<Place, "id" | "user_id" | "created_at" | "avg_rating" | "review_count">;

export async function createPlace(input: NewPlace): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("Please log in first");
  const { data, error } = await sb
    .from("places")
    .insert({ ...input, user_id: u.user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type NewReview = Omit<Review, "id" | "user_id" | "created_at" | "author">;

export async function createReview(input: NewReview): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("Please log in first");
  const { error } = await sb.from("reviews").upsert(
    { ...input, user_id: u.user.id },
    { onConflict: "place_id,user_id" },
  );
  if (error) throw error;
}

export async function toggleSave(placeId: string, saved: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("Please log in first");
  if (saved) {
    const { error } = await sb.from("saves").delete().eq("place_id", placeId).eq("user_id", u.user.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("saves").insert({ place_id: placeId, user_id: u.user.id });
    if (error) throw error;
  }
}

export async function listSavedIds(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data } = await sb.from("saves").select("place_id").eq("user_id", u.user.id);
  return (data ?? []).map((r: { place_id: string }) => r.place_id);
}

export { isConfigured };
