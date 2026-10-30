import { track } from "./analytics";
import { getSupabase, isConfigured } from "./supabase";
import { SAMPLE_PLACES, SAMPLE_REVIEWS } from "./sample";
import type { Plan, PlanRequestT } from "./planSchema";
import { SAMPLE_TRIPS } from "./sampleTrips";
import { uploadImage } from "./upload";
import type {
  Activity, AppNotification, Category, Collection, ConditionKind, Enquiry, Itinerary, ItineraryItem, Place, PlaceReport, PlaceStats, Profile, ProfileStats, ReportReason,
  Listing, ListingKind, PlacePhoto, Poll, PollKind, Post, PostComment, PriceUnit, Review, Trip, TripExpense, TripMember, TripMessage, UserRating,
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
  const ids = places.map((p) => p.id);
  const { data: stats } = await sb.from("place_stats").select("*").in("place_id", ids);
  const byId = new Map((stats as Stats[] | null)?.map((s) => [s.place_id, s]));
  const { data: covers } = await sb.from("place_covers").select("*").in("place_id", ids);
  const coverById = new Map((covers as { place_id: string; storage_key: string }[] | null)?.map((c) => [c.place_id, c.storage_key]));
  return places.map((p) => ({
    ...p,
    avg_rating: byId.get(p.id)?.avg_rating ?? null,
    review_count: byId.get(p.id)?.review_count ?? 0,
    cover_key: coverById.get(p.id) ?? null,
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
  track("place_created", { category: input.category });
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
  track("review_created");
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
    track("place_saved");
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
  track("trip_created", { style: input.style });
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
  track("join_requested");
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
  track("report_filed", { reason: input.reason });
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
  track("itinerary_created", { ai: input.ai_generated });
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
  track("ai_plan_generated", { days: input.days });
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

// ---------- Place dimensions, conditions, expenses (Phase 5) ----------
export async function getPlaceStats(placeId: string): Promise<PlaceStats | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("place_dimension_stats").select("*").eq("place_id", placeId).maybeSingle();
  if (error) throw error;
  return (data as PlaceStats | null) ?? null;
}

/** Condition reports from the last 90 days, newest first. */
export async function listPlaceReports(placeId: string): Promise<PlaceReport[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data, error } = await sb.from("place_reports").select("*, profiles(display_name)")
    .eq("place_id", placeId).gte("created_at", since).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as PlaceReport),
    author: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function reportCondition(placeId: string, kind: ConditionKind, note: string | null): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("place_reports").insert({ place_id: placeId, user_id: uid, kind, note });
  if (error) throw error;
  track("condition_reported", { kind });
}

export async function listExpenses(tripId: string): Promise<TripExpense[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("trip_expenses").select("*, profiles(display_name)")
    .eq("trip_id", tripId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as TripExpense),
    amount: Number((r as { amount: unknown }).amount),
    payer: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function addExpense(input: Pick<TripExpense, "trip_id" | "amount" | "description" | "category">): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("trip_expenses").insert({ ...input, paid_by: uid });
  if (error) throw error;
  track("expense_added", { category: input.category });
}

export async function deleteExpense(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("trip_expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Photos (Phase 6, stored in Cloudflare R2) ----------
export async function listPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("place_photos").select("*, profiles(display_name)")
    .eq("place_id", placeId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as PlacePhoto),
    uploader: (r.profiles as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

/** Attach an already-uploaded image (by storage key) to a place. */
export async function addPlacePhoto(placeId: string, storageKey: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("place_photos").insert({ place_id: placeId, user_id: uid, storage_key: storageKey });
  if (error) throw error;
  track("photo_uploaded");
}

export async function deletePlacePhoto(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please log in first");
  const res = await fetch(`/api/upload?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete the photo.");
}

// ---------- Group polls (Phase 7) ----------
export async function listPolls(tripId: string): Promise<Poll[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: polls, error } = await sb.from("polls").select("*").eq("trip_id", tripId).order("created_at", { ascending: false });
  if (error) throw error;
  if (!polls?.length) return [];
  const ids = polls.map((p: { id: string }) => p.id);
  const [{ data: options, error: e2 }, { data: votes, error: e3 }] = await Promise.all([
    sb.from("poll_options").select("*").in("poll_id", ids).order("created_at"),
    sb.from("poll_votes").select("*, profiles(display_name)").in("poll_id", ids),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  return polls.map((p: Record<string, unknown>) => ({
    ...(p as unknown as Poll),
    options: (options ?? []).filter((o: { poll_id: string }) => o.poll_id === p.id),
    votes: (votes ?? []).filter((v: { poll_id: string }) => v.poll_id === p.id).map((v: Record<string, unknown>) => ({
      ...(v as unknown as { poll_id: string; option_id: string; user_id: string }),
      voter: (v.profiles as { display_name: string | null } | null)?.display_name ?? null,
    })),
  }));
}

export async function createPoll(tripId: string, question: string, kind: PollKind, labels: string[]): Promise<void> {
  const { sb, uid } = await requireUser();
  const { data, error } = await sb.from("polls").insert({ trip_id: tripId, created_by: uid, question, kind }).select("id").single();
  if (error) throw error;
  const pollId = data.id as string;
  if (labels.length) {
    const { error: e2 } = await sb.from("poll_options").insert(labels.map((label) => ({ poll_id: pollId, label, added_by: uid })));
    if (e2) {
      await sb.from("polls").delete().eq("id", pollId); // don't leave an empty poll behind
      throw e2;
    }
  }
  track("poll_created", { kind });
}

export async function addPollOption(pollId: string, label: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("poll_options").insert({ poll_id: pollId, label, added_by: uid });
  if (error) throw error;
}

/** Cast or change your vote (one vote per person per poll). */
export async function castVote(pollId: string, optionId: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("poll_votes").upsert(
    { poll_id: pollId, option_id: optionId, user_id: uid }, { onConflict: "poll_id,user_id" });
  if (error) throw error;
  track("poll_voted");
}

export async function withdrawVote(pollId: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", uid);
  if (error) throw error;
}

export async function setPollStatus(pollId: string, status: "open" | "closed"): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("polls").update({ status }).eq("id", pollId);
  if (error) throw error;
}

export async function deletePoll(pollId: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("polls").delete().eq("id", pollId);
  if (error) throw error;
}

// ---------- Social: posts, likes, comments, follows, collections (Phase 8) ----------

type ProfileRef = { display_name: string | null; avatar_key: string | null } | null;

export async function getActivity(userId: string): Promise<Activity | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("profile_activity").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as Activity | null) ?? null;
}

export async function setAvatar(key: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("profiles").update({ avatar_key: key }).eq("id", uid);
  if (error) throw error;
}

export async function isFollowing(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return false;
  const { data } = await sb.from("follows").select("followee_id").eq("follower_id", u.user.id).eq("followee_id", userId).maybeSingle();
  return Boolean(data);
}

export async function setFollowing(userId: string, follow: boolean): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = follow
    ? await sb.from("follows").insert({ follower_id: uid, followee_id: userId })
    : await sb.from("follows").delete().eq("follower_id", uid).eq("followee_id", userId);
  if (error) throw error;
  if (follow) track("followed");
}

export async function listFollowingIds(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data } = await sb.from("follows").select("followee_id").eq("follower_id", u.user.id);
  return (data ?? []).map((r: { followee_id: string }) => r.followee_id);
}

export const POSTS_PAGE = 12;

/** Newest first. `userIds` limits to specific authors (e.g. people you follow). `before` is a created_at cursor. */
export async function listPosts(opts: { userIds?: string[]; before?: string; postId?: string } = {}): Promise<Post[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("posts").select("*, profiles(display_name, avatar_key), places(title)").order("created_at", { ascending: false });
  if (opts.postId) q = q.eq("id", opts.postId);
  else q = q.limit(POSTS_PAGE);
  if (opts.userIds) {
    if (opts.userIds.length === 0) return [];
    q = q.in("user_id", opts.userIds);
  }
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as (Record<string, unknown> & { id: string })[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const { data: u } = await sb.auth.getUser();
  const [photos, stats, mine] = await Promise.all([
    sb.from("post_photos").select("id, post_id, storage_key, position").in("post_id", ids).order("position"),
    sb.from("post_stats").select("*").in("post_id", ids),
    u.user ? sb.from("post_likes").select("post_id").eq("user_id", u.user.id).in("post_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const likedSet = new Set(((mine.data ?? []) as { post_id: string }[]).map((l) => l.post_id));
  return rows.map((r) => {
    const st = ((stats.data ?? []) as { post_id: string; likes: number; comments: number }[]).find((s) => s.post_id === r.id);
    const prof = r.profiles as ProfileRef;
    return {
      id: r.id, user_id: r.user_id as string, body: r.body as string, place_id: (r.place_id as string | null) ?? null,
      created_at: r.created_at as string, author_name: prof?.display_name ?? null, author_avatar: prof?.avatar_key ?? null,
      place_title: (r.places as { title: string } | null)?.title ?? null,
      photos: ((photos.data ?? []) as { id: string; post_id: string; storage_key: string }[])
        .filter((p) => p.post_id === r.id).map((p) => ({ id: p.id, storage_key: p.storage_key })),
      likes: st?.likes ?? 0, comments: st?.comments ?? 0, liked_by_me: likedSet.has(r.id),
    };
  });
}

/** Uploads photos first, then creates the post, so a failed upload never leaves a half-made post. */
export async function createPost(body: string, placeId: string | null, files: File[]): Promise<string> {
  const { sb, uid } = await requireUser();
  const keys: string[] = [];
  for (const f of files.slice(0, 4)) keys.push(await uploadImage(f, "posts"));
  const { data, error } = await sb.from("posts").insert({ user_id: uid, body, place_id: placeId }).select("id").single();
  if (error) throw error;
  const id = data.id as string;
  if (keys.length) {
    const { error: e2 } = await sb.from("post_photos").insert(keys.map((storage_key, position) => ({ post_id: id, user_id: uid, storage_key, position })));
    if (e2) {
      await sb.from("posts").delete().eq("id", id);
      throw e2;
    }
  }
  track("post_created", { photos: keys.length });
  return id;
}

export async function deletePost(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please log in first");
  const res = await fetch(`/api/upload?post=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${data.session.access_token}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete the post.");
}

export async function setLiked(postId: string, liked: boolean): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = liked
    ? await sb.from("post_likes").insert({ post_id: postId, user_id: uid })
    : await sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", uid);
  if (error) throw error;
  if (liked) track("post_liked");
}

export async function listComments(postId: string): Promise<PostComment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("post_comments").select("*, profiles(display_name, avatar_key)").eq("post_id", postId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((c: Record<string, unknown>) => {
    const prof = c.profiles as ProfileRef;
    return { ...(c as unknown as PostComment), author_name: prof?.display_name ?? null, author_avatar: prof?.avatar_key ?? null };
  });
}

export async function addComment(postId: string, body: string): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("post_comments").insert({ post_id: postId, user_id: uid, body });
  if (error) throw error;
  track("comment_added");
}

export async function deleteComment(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("post_comments").delete().eq("id", id);
  if (error) throw error;
}

export async function listVisitedPlaces(userId: string): Promise<{ id: string; title: string; category: string }[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("reviews").select("created_at, places(id, title, category)").eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => r.places as { id: string; title: string; category: string } | null).filter((p): p is { id: string; title: string; category: string } => Boolean(p));
}

// ---- collections ----
export async function listCollections(opts: { mine?: boolean; userId?: string } = {}): Promise<Collection[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("collections").select("*, profiles(display_name), collection_places(count)").order("created_at", { ascending: false }).limit(60);
  if (opts.userId) q = q.eq("user_id", opts.userId).eq("is_public", true);
  else if (opts.mine) {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return [];
    q = q.eq("user_id", u.user.id);
  } else q = q.eq("is_public", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...(c as unknown as Collection),
    owner_name: (c.profiles as { display_name: string | null } | null)?.display_name ?? null,
    place_count: (c.collection_places as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function getCollection(id: string): Promise<Collection | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("collections").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as unknown as Collection), owner_name: (data.profiles as { display_name: string | null } | null)?.display_name ?? null };
}

export async function listCollectionPlaces(id: string): Promise<Place[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("collection_places").select("added_at, places(*)").eq("collection_id", id).order("added_at");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => r.places as Place | null).filter((p): p is Place => Boolean(p));
}

export async function createCollection(title: string, description: string | null, isPublic: boolean): Promise<string> {
  const { sb, uid } = await requireUser();
  const { data, error } = await sb.from("collections").insert({ user_id: uid, title, description, is_public: isPublic }).select("id").single();
  if (error) throw error;
  track("collection_created");
  return data.id as string;
}

export async function updateCollection(id: string, patch: { title?: string; description?: string | null; is_public?: boolean }): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("collections").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function addToCollection(collectionId: string, placeId: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("collection_places").insert({ collection_id: collectionId, place_id: placeId });
  if (error) throw new Error(error.code === "23505" ? "Already in this collection" : error.message);
}

export async function removeFromCollection(collectionId: string, placeId: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("collection_places").delete().eq("collection_id", collectionId).eq("place_id", placeId);
  if (error) throw error;
}

// ---------- Utilities (Phase 9) ----------
export type CostReality = { place_id: string; reports: number; avg_advertised: number; avg_actual: number };

export async function getCostReality(placeId: string): Promise<CostReality | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("place_cost_reality").select("*").eq("place_id", placeId).maybeSingle();
  if (error) throw error;
  return (data as CostReality | null) ?? null;
}

export type EmergencyContact = { id: string; name: string; phone: string; relation: string | null };

export async function listContacts(): Promise<EmergencyContact[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("emergency_contacts").select("id,name,phone,relation").order("created_at");
  if (error) throw error;
  return (data ?? []) as EmergencyContact[];
}

export async function addContact(c: { name: string; phone: string; relation: string | null }): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("emergency_contacts").insert({ ...c, user_id: uid, phone: c.phone.replace(/[\s()-]/g, "") });
  if (error) throw new Error(error.code === "23514" ? "Enter the phone number with country code, e.g. +919876543210" : error.message);
}

export async function deleteContact(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("emergency_contacts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Directory (Phase 11) ----------

type ListingRow = Listing & { profiles?: { display_name: string | null } | null };
const toListing = ({ profiles, ...l }: ListingRow): Listing => ({ ...l, owner_name: profiles?.display_name ?? null });

/** `includeHidden` only has an effect for admins: the database still decides what each person may see. */
export async function listListings(opts: { kind?: ListingKind | "all"; mine?: boolean; includeHidden?: boolean } = {}): Promise<Listing[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("listings").select("*, profiles(display_name)").order("verified", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  if (opts.mine) {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return [];
    q = q.eq("owner_id", u.user.id);
  } else if (!opts.includeHidden) {
    q = q.eq("status", "active").eq("hidden_by_admin", false);
  }
  if (opts.kind && opts.kind !== "all") q = q.eq("kind", opts.kind);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as ListingRow[]).map(toListing);
}

export async function getListing(id: string): Promise<Listing | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("listings").select("*, profiles(display_name)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toListing(data as ListingRow) : null;
}

export type ListingInput = {
  kind: ListingKind; name: string; description: string | null; city: string | null;
  price_from: number | null; price_unit: PriceUnit | null; website: string | null; photo_key?: string | null;
};

export async function createListing(input: ListingInput): Promise<string> {
  const { sb, uid } = await requireUser();
  const { data, error } = await sb.from("listings").insert({ ...input, owner_id: uid }).select("id").single();
  if (error) throw new Error(error.code === "23514" ? "Check the website (it must start with https://) and the other fields." : error.message);
  track("listing_created", { kind: input.kind });
  return data.id as string;
}

export async function updateListing(id: string, patch: Partial<ListingInput> & { status?: "active" | "hidden" }): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("listings").update(patch).eq("id", id);
  if (error) throw new Error(error.code === "23514" ? "Check the website (it must start with https://) and the other fields." : error.message);
}

export async function deleteListing(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("listings").delete().eq("id", id);
  if (error) throw error;
}

export async function sendEnquiry(input: { listing_id: string; message: string; contact: string; start_date: string | null; end_date: string | null; people: number | null }): Promise<void> {
  const { sb, uid } = await requireUser();
  const { error } = await sb.from("enquiries").insert({ ...input, from_user: uid });
  if (error) throw new Error(/several enquiries|Daily enquiry/.test(error.message) ? error.message : error.code === "42501" ? "You can't send an enquiry to this business." : error.message);
  track("enquiry_sent");
}

/** Enquiries received by the business owner for one listing. */
export async function listEnquiriesFor(listingId: string): Promise<Enquiry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("enquiries").select("*, profiles(display_name)").eq("listing_id", listingId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({ ...(r as unknown as Enquiry), traveller: (r.profiles as { display_name: string | null } | null)?.display_name ?? null }));
}

/** Enquiries you sent as a traveller. */
export async function listMyEnquiries(): Promise<Enquiry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("enquiries").select("*, listings(name)").eq("from_user", u.user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({ ...(r as unknown as Enquiry), listing_name: (r.listings as { name: string } | null)?.name ?? null }));
}

export async function replyToEnquiry(id: string, reply: string | null, status: "replied" | "closed"): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("enquiries").update({ owner_reply: reply, status, replied_at: reply ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw error;
}

export async function countNewEnquiries(listingIds: string[]): Promise<Record<string, number>> {
  const sb = getSupabase();
  if (!sb || listingIds.length === 0) return {};
  const { data } = await sb.from("enquiries").select("listing_id").eq("status", "new").in("listing_id", listingIds);
  const out: Record<string, number> = {};
  (data ?? []).forEach((r: { listing_id: string }) => { out[r.listing_id] = (out[r.listing_id] ?? 0) + 1; });
  return out;
}

// ---------- Admin (Phase 11) ----------
export async function checkIsAdmin(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return false;
  const { data } = await sb.rpc("is_admin");
  return data === true;
}

export type AdminReport = {
  id: string; reason: string; details: string | null; status: "open" | "reviewing" | "actioned" | "dismissed"; created_at: string;
  reporter_id: string; target_user_id: string; trip_id: string | null; message_id: string | null;
  reporter_name: string | null; target_name: string | null;
};

export async function adminListReports(status: AdminReport["status"] | "all"): Promise<AdminReport[]> {
  const { sb } = await requireUser();
  let q = sb.from("reports").select("*, reporter:profiles!reports_reporter_id_fkey(display_name), target:profiles!reports_target_user_id_fkey(display_name)")
    .order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as AdminReport),
    reporter_name: (r.reporter as { display_name: string | null } | null)?.display_name ?? null,
    target_name: (r.target as { display_name: string | null } | null)?.display_name ?? null,
  }));
}

export async function adminSetReportStatus(id: string, status: AdminReport["status"]): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function adminSetListing(id: string, verified: boolean, hidden: boolean): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.rpc("admin_set_listing", { lid: id, set_verified: verified, set_hidden: hidden });
  if (error) throw error;
}

export type AdminMetrics = {
  validation: Record<string, number | null> | null; daily: { day: string; active_people: number; active_members: number }[];
  open_reports: number; listings: number; unverified_listings: number;
};
export async function adminMetrics(): Promise<AdminMetrics> {
  const { sb } = await requireUser();
  const { data, error } = await sb.rpc("admin_metrics");
  if (error) throw error;
  return data as AdminMetrics;
}

/** Remove content as an admin (allowed by database rules, only for admins). */
export async function adminDelete(table: "post_comments" | "reviews" | "places" | "place_reports" | "trip_messages" | "collections", id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

// ---------- Notifications & suspension (Phase 12) ----------
export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function unreadNotificationCount(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return 0;
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) throw error;
}

/** Your own suspension, if any (so the app can explain why you can't post). */
export async function getMySuspension(): Promise<{ reason: string | null } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data } = await sb.from("suspensions").select("reason").eq("user_id", u.user.id).maybeSingle();
  return data ? { reason: (data as { reason: string | null }).reason } : null;
}

/** Admin only (the database enforces it). */
export async function adminIsSuspended(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.from("suspensions").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}
export async function adminSuspend(userId: string, reason: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.rpc("admin_suspend_user", { target: userId, why: reason });
  if (error) throw error;
}
export async function adminUnsuspend(userId: string): Promise<void> {
  const { sb } = await requireUser();
  const { error } = await sb.rpc("admin_unsuspend_user", { target: userId });
  if (error) throw error;
}
