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
