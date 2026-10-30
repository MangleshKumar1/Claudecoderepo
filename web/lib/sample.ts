import type { Place, Review } from "./types";

// Shown when Supabase env vars are not set, so the UI is explorable immediately.
export const SAMPLE_PLACES: Place[] = [
  {
    id: "sample-1", user_id: "demo", title: "Hampta Pass Trek", category: "trek",
    description: "Crossover trek from the green Kullu valley to the stark Lahaul desert.",
    lat: 32.2396, lng: 77.1887, best_season: "Jun-Sep",
    how_to_reach: "Manali to Jobra by cab, about 1 hour.",
    tips: "Carry warm layers, start early to cross the pass before noon.",
    photo_url: null, created_at: "2026-10-01T00:00:00Z", avg_rating: 4.8, review_count: 12,
  },
  {
    id: "sample-2", user_id: "demo", title: "Gokarna Kudle Beach", category: "beach",
    description: "Quiet crescent beach with beach shacks and sunsets, far calmer than Goa.",
    lat: 14.5226, lng: 74.3189, best_season: "Nov-Feb",
    how_to_reach: "Gokarna Road station, then auto to Kudle, about 30 min.",
    tips: "Walk the cliff trail between Om and Kudle beaches.",
    photo_url: null, created_at: "2026-10-02T00:00:00Z", avg_rating: 4.5, review_count: 8,
  },
  {
    id: "sample-3", user_id: "demo", title: "Chopta Tungnath", category: "mountain",
    description: "Mini Switzerland of India, the highest Shiva temple trek.",
    lat: 30.4916, lng: 79.0916, best_season: "Mar-Jun, Sep-Nov",
    how_to_reach: "Haridwar -> Ukhimath -> Chopta by road.",
    tips: "Book stays in advance during Char Dham season.",
    photo_url: null, created_at: "2026-10-03T00:00:00Z", avg_rating: 4.7, review_count: 15,
  },
];

export const SAMPLE_REVIEWS: Review[] = [
  {
    id: "r1", place_id: "sample-1", user_id: "demo", rating: 5,
    pros: "Stunning views, well-marked trail", cons: "Cold nights, limited network",
    price_paid: 450, price_note: "Cab Manali to Jobra (shared)", currency: "INR",
    value_rating: 5, safety_rating: 4, visited_on: "2026-07-14",
    beauty_rating: 5, accessibility_rating: 3, cleanliness_rating: 4, crowd_rating: 2, advertised_price: null, actual_price: null,
    created_at: "2026-07-20T00:00:00Z", author: "demo",
  },
];
