import { getSupabase, isConfigured } from "./supabase";
import { SAMPLE_PLACES, SAMPLE_REVIEWS } from "./sample";
import type { Plan, PlanRequestT } from "./planSchema";
import { SAMPLE_TRIPS } from "./sampleTrips";
import type {
  Category, Itinerary, ItineraryItem, Place, Profile, ProfileStats, ReportReason, Review, Trip, TripMember, TripMessage, UserRating,
} from "./types";

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

// ---------- Safety (Phase 3) ----------

export async function getProfile(id: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getProfileStats(id: string): Promise<ProfileStats | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("profile_stats").select("*").eq("user_id", id).maybeSingle();
  if (error) throw error;
  return (data as ProfileStats | null) ?? null;
}

export type ProfileEdit = Pick<Profile, "display_name" | "username" | "bio" | "home_city" | "languages">;

export async function updateProfile(input: ProfileEdit): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("profiles").update(input).eq("id", uid);
  if (error) {
    throw new Error(error.code === "23505" ? "That username is already taken" : error.message);
  }
}

export async function startPhoneVerification(phone: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.auth.updateUser({ phone });
  if (error) throw error;
}

export async function confirmPhone(phone: string, token: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.auth.verifyOtp({ phone, token, type: "phone_change" });
  if (error) throw error;
}

export async function listRatingsFor(userId: string): Promise<UserRating[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("user_ratings").select("*, profiles!user_ratings_rater_id_fkey(display_name)")
    .eq("ratee_id", userId).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as UserRating),
    rater_name: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

/** Ratings the current user has already given on this trip. */
export async function listMyRatingsForTrip(tripId: string): Promise<UserRating[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("user_ratings").select("*").eq("trip_id", tripId).eq("rater_id", u.user.id);
  if (error) throw error;
  return (data ?? []) as UserRating[];
}

export async function rateUser(input: {
  trip_id: string; ratee_id: string; rating: number; would_travel_again: boolean | null; comment: string | null;
}): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("user_ratings").upsert(
    { ...input, rater_id: uid }, { onConflict: "trip_id,rater_id,ratee_id" });
  if (error) {
    throw new Error(error.code === "42501" ? "You can only rate people after the trip has ended" : error.message);
  }
}

export async function reportUser(input: {
  target_user_id: string; reason: ReportReason; details: string | null;
  trip_id?: string | null; message_id?: string | null;
}): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("reports").insert({
    reporter_id: uid, target_user_id: input.target_user_id, reason: input.reason, details: input.details,
    trip_id: input.trip_id ?? null, message_id: input.message_id ?? null,
  });
  if (error) throw error;
}

export async function listBlocked(): Promise<{ id: string; name: string | null }[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("blocks").select("blocked_id, profiles!blocks_blocked_id_fkey(display_name)")
    .eq("blocker_id", u.user.id);
  if (error) throw error;
  return (data ?? []).map((b: Record<string, unknown>) => ({
    id: b.blocked_id as string,
    name: (b.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function setBlocked(userId: string, blocked: boolean): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = blocked
    ? await sb.from("blocks").insert({ blocker_id: uid, blocked_id: userId })
    : await sb.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", userId);
  if (error) throw error;
}

// ---------- Itineraries & AI planner (Phase 4) ----------

type ItineraryRow = Itinerary & { profiles?: { display_name: string | null } | null };
const toItinerary = ({ profiles, ...i }: ItineraryRow): Itinerary => ({ ...i, owner: profiles?.display_name ?? null });

export async function listMyItineraries(): Promise<Itinerary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("itineraries").select("*").eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Itinerary[];
}

export async function listPublicItineraries(): Promise<Itinerary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("itineraries").select("*, profiles(display_name)").eq("is_public", true)
    .order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return ((data ?? []) as ItineraryRow[]).map(toItinerary);
}

export async function listTripItineraries(tripId: string): Promise<Itinerary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("itineraries").select("*").eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Itinerary[];
}

export async function getItinerary(id: string): Promise<Itinerary | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("itineraries").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toItinerary(data as ItineraryRow) : null;
}

export async function listItems(itineraryId: string): Promise<ItineraryItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("itinerary_items").select("*").eq("itinerary_id", itineraryId)
    .order("day").order("position");
  if (error) throw error;
  return (data ?? []) as ItineraryItem[];
}

export type NewItinerary = Pick<Itinerary,
  "title" | "destination" | "dest_lat" | "dest_lng" | "summary" | "extra_notes" | "start_date" | "num_days" |
  "budget_per_person" |
  "trip_id" | "ai_generated">;
export type NewItem = Omit<ItineraryItem, "id" | "itinerary_id">;

export async function createItinerary(input: NewItinerary, items: NewItem[] = []): Promise<string> {
  const { sb, uid } = await requireUser();
  const { data, error } = await sb.from("itineraries").insert({ ...input, user_id: uid }).select("id").single();
  if (error) throw error;
  const id = data.id as string;
  if (items.length) {
    const { error: e2 } = await sb.from("itinerary_items").insert(items.map((it) => ({ ...it, itinerary_id: id })));
    if (e2) {
      await sb.from("itineraries").delete().eq("id", id); // don't leave an empty shell behind
      throw e2;
    }
  }
  return id;
}

export async function updateItinerary(id: string, patch: Partial<Pick<Itinerary,
  "title" | "summary" | "extra_notes" | "is_public" | "budget_per_person" | "num_days" | "start_date" | "trip_id">>): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("itineraries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItinerary(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("itineraries").delete().eq("id", id);
  if (error) throw error;
}

export async function addItem(itineraryId: string, item: NewItem): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("itinerary_items").insert({ ...item, itinerary_id: itineraryId });
  if (error) throw error;
}

export async function updateItem(id: string, patch: Partial<Omit<ItineraryItem, "id" | "itinerary_id">>): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("itinerary_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("itinerary_items").delete().eq("id", id);
  if (error) throw error;
}

/** Swap the order of two items in the same day. */
export async function swapItems(a: ItineraryItem, b: ItineraryItem): Promise<void> {
  const { sb } = await requireUser();
  // Positions can tie (e.g. both 0), so assign distinct values rather than exchanging them.
  const first = Math.min(a.position, b.position);
  const [x, y] = a.position <= b.position ? [a, b] : [b, a];
  const r1 = await sb.from("itinerary_items").update({ position: first + 1 }).eq("id", x.id);
  const r2 = await sb.from("itinerary_items").update({ position: first }).eq("id", y.id);
  if (r1.error || r2.error) throw r1.error ?? r2.error;
}

export async function requestAiPlan(input: Omit<PlanRequestT, "style"> & { style: PlanRequestT["style"] }): Promise<Plan> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please log in first");
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "The planner failed. Please try again.");
  return body.plan as Plan;
}

/** Turn an AI plan into rows ready for createItinerary. */
export function planToItems(plan: Plan): NewItem[] {
  return plan.days.flatMap((d) =>
    d.items.map((it, i) => ({
      day: d.day, position: i, time_of_day: it.time_of_day, title: it.title,
      description: it.description, est_cost: it.est_cost, lat: it.lat, lng: it.lng, place_id: it.place_id,
    })),
  );
}
