export const CATEGORIES = [
  "beach", "mountain", "trek", "food", "city", "culture", "nature", "stay", "offbeat",
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
