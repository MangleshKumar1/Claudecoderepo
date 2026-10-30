import { getSupabase, isConfigured } from "./supabase";
import { SAMPLE_PLACES, SAMPLE_REVIEWS } from "./sample";
import { SAMPLE_TRIPS } from "./sampleTrips";
import type { Category, Place, Review, Trip, TripMember, TripMessage } from "./types";

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

// ---------- Trips (Phase 2) ----------
const today = () => new Date().toISOString().slice(0, 10);

async function requireUser() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Please log in first");
  return { sb, uid: data.user.id };
}

type TripRow = Trip & { profiles?: { display_name: string | null } | null };

async function withCounts(rows: TripRow[]): Promise<Trip[]> {
  const sb = getSupabase()!;
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data } = await sb.from("trip_members").select("trip_id").eq("status", "approved")
      .in("trip_id", rows.map((r) => r.id));
    (data ?? []).forEach((m: { trip_id: string }) => counts.set(m.trip_id, (counts.get(m.trip_id) ?? 0) + 1));
  }
  return rows.map(({ profiles, ...t }) => ({
    ...t,
    owner: profiles?.display_name ?? null,
    member_count: counts.get(t.id) ?? 0,
  }));
}

/** Upcoming (not yet ended) trips, soonest first. */
export async function listTrips(): Promise<Trip[]> {
  const sb = getSupabase();
  if (!sb) return SAMPLE_TRIPS;
  const { data, error } = await sb.from("trips").select("*, profiles(display_name)")
    .gte("end_date", today()).order("start_date").limit(200);
  if (error) throw error;
  return withCounts((data ?? []) as TripRow[]);
}

export async function getTrip(id: string): Promise<Trip | null> {
  const sb = getSupabase();
  if (!sb) return SAMPLE_TRIPS.find((t) => t.id === id) ?? null;
  const { data, error } = await sb.from("trips").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withCounts([data as TripRow]))[0];
}

export type NewTrip = Omit<Trip, "id" | "user_id" | "created_at" | "owner" | "member_count">;

export async function createTrip(input: NewTrip): Promise<string> {
  const { sb, uid } = await requireUser();
  const { data, error } = await sb.from("trips").insert({ ...input, user_id: uid }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteTrip(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("trips").delete().eq("id", id);
  if (error) throw error;
}

export async function listMyTrips(): Promise<Trip[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("trips").select("*").eq("user_id", u.user.id)
    .gte("end_date", today()).order("start_date");
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function listMembers(tripId: string): Promise<TripMember[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("trip_members").select("*, profiles(display_name)")
    .eq("trip_id", tripId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((m: Record<string, unknown>) => ({
    ...(m as unknown as TripMember),
    name: (m.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function requestToJoin(tripId: string, message: string | null): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("trip_members").insert({ trip_id: tripId, user_id: uid, message });
  if (error) throw error;
}

export async function decideMember(tripId: string, userId: string, status: "approved" | "rejected"): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("trip_members").update({ status }).eq("trip_id", tripId).eq("user_id", userId);
  if (error) throw error;
}

export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", userId);
  if (error) throw error;
}

export async function listMessages(tripId: string): Promise<TripMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("trip_messages").select("*, profiles(display_name)")
    .eq("trip_id", tripId).order("created_at").limit(500);
  if (error) throw error;
  return (data ?? []).map((m: Record<string, unknown>) => ({
    ...(m as unknown as TripMessage),
    author: (m.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function sendMessage(tripId: string, body: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("trip_messages").insert({ trip_id: tripId, user_id: uid, body });
  if (error) throw error;
}

/** Calls `onChange` whenever a message is added to the trip. Returns an unsubscribe function. */
export function subscribeToMessages(tripId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const channel = sb
    .channel(`trip-messages-${tripId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "trip_messages", filter: `trip_id=eq.${tripId}` },
      onChange)
    .subscribe();
  return () => { sb.removeChannel(channel); };
}
