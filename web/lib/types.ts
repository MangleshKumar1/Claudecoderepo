export const CATEGORIES = [
  "beach", "mountain", "trek", "food", "city", "culture", "nature", "stay", "offbeat",
  "waterfall", "viewpoint", "rest_stop",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Place = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: Category;
  lat: number;
  lng: number;
  best_season: string | null;
  how_to_reach: string | null;
  tips: string | null;
  photo_url: string | null;
  created_at: string;
  avg_rating?: number | null;
  review_count?: number;
  cover_key?: string | null; // storage key of the first uploaded photo
};

export type Review = {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  pros: string | null;
  cons: string | null;
  price_paid: number | null;
  price_note: string | null;
  currency: string | null;
  value_rating: number | null;
  safety_rating: number | null;
  visited_on: string | null;
  beauty_rating: number | null;
  accessibility_rating: number | null;
  cleanliness_rating: number | null;
  crowd_rating: number | null;
  created_at: string;
  author?: string | null;
};

export const TRIP_STYLES = ["budget", "comfort", "adventure", "relaxed", "mixed"] as const;
export type TripStyle = (typeof TRIP_STYLES)[number];

export type Trip = {
  id: string;
  user_id: string;
  title: string;
  origin: string | null;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  budget_per_person: number | null;
  style: TripStyle;
  max_buddies: number;
  notes: string | null;
  created_at: string;
  owner?: string | null;
  member_count?: number; // approved members excluding the owner
};

export type TripMember = {
  trip_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  created_at: string;
  name?: string | null;
};

export type TripMessage = {
  id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: string | null;
};

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  home_city: string | null;
  languages: string[];
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
};

export type ProfileStats = {
  user_id: string;
  rating_avg: number | null;
  rating_count: number;
  trips_hosted: number;
  trips_joined: number;
};

export type UserRating = {
  id: string;
  trip_id: string;
  rater_id: string;
  ratee_id: string;
  rating: number;
  would_travel_again: boolean | null;
  comment: string | null;
  created_at: string;
  rater_name?: string | null;
};

export const REPORT_REASONS = [
  ["harassment", "Harassment or abuse"],
  ["scam", "Scam or fraud"],
  ["fake_profile", "Fake profile"],
  ["unsafe_behavior", "Unsafe behaviour"],
  ["inappropriate_content", "Inappropriate content"],
  ["other", "Other"],
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number][0];

export const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export type Itinerary = {
  id: string;
  user_id: string;
  trip_id: string | null;
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  summary: string | null;
  extra_notes: string | null;
  start_date: string | null;
  num_days: number;
  budget_per_person: number | null;
  is_public: boolean;
  ai_generated: boolean;
  created_at: string;
  owner?: string | null;
};

export type ItineraryItem = {
  id: string;
  itinerary_id: string;
  day: number;
  position: number;
  time_of_day: TimeOfDay;
  title: string;
  description: string | null;
  est_cost: number | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
};

export type PlaceStats = {
  place_id: string;
  review_count: number;
  avg_rating: number | null;
  avg_beauty: number | null;
  avg_accessibility: number | null;
  avg_cleanliness: number | null;
  avg_safety: number | null;
  avg_value: number | null;
  avg_crowd: number | null;
  last_visited: string | null;
};

export const CONDITION_KINDS = [
  ["all_good", "All good, nothing to report"],
  ["road_damaged", "Road is damaged"],
  ["fee_changed", "Entry or parking fee changed"],
  ["dry_or_closed", "Dry / closed right now"],
  ["parking_unavailable", "Parking unavailable"],
  ["overcrowded", "Overcrowded"],
  ["unsafe", "Feels unsafe"],
  ["permanently_closed", "Permanently closed"],
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number][0];

export type PlaceReport = {
  id: string;
  place_id: string;
  user_id: string;
  kind: ConditionKind;
  note: string | null;
  created_at: string;
  author?: string | null;
};

export const EXPENSE_CATEGORIES = ["stay", "transport", "fuel", "food", "activities", "tickets", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type TripExpense = {
  id: string;
  trip_id: string;
  paid_by: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  created_at: string;
  payer?: string | null;
};

export type PlacePhoto = {
  id: string;
  place_id: string;
  user_id: string;
  storage_key: string;
  caption: string | null;
  created_at: string;
  uploader?: string | null;
};

export const POLL_KINDS = [
  ["destination", "Destination"], ["dates", "Dates"], ["stay", "Where to stay"],
  ["activity", "Activity"], ["transport", "Transport"], ["other", "Something else"],
] as const;
export type PollKind = (typeof POLL_KINDS)[number][0];

export type PollOption = { id: string; poll_id: string; label: string; added_by: string };
export type PollVote = { poll_id: string; option_id: string; user_id: string; voter?: string | null };
export type Poll = {
  id: string;
  trip_id: string;
  created_by: string;
  question: string;
  kind: PollKind;
  status: "open" | "closed";
  created_at: string;
  options: PollOption[];
  votes: PollVote[];
};
