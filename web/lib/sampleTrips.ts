import type { Trip } from "./types";

const year = new Date().getFullYear() + 1;

export const SAMPLE_TRIPS: Trip[] = [
  {
    id: "trip-sample-1", user_id: "demo", title: "Manali weekend crew", origin: "Delhi",
    destination: "Manali", dest_lat: 32.2396, dest_lng: 77.1887,
    start_date: `${year}-03-14`, end_date: `${year}-03-17`, budget_per_person: 8000,
    style: "adventure", max_buddies: 4, notes: "Looking for 2-3 people, renting a car from Delhi.",
    created_at: "2026-10-01T00:00:00Z", owner: "demo", member_count: 1,
  },
  {
    id: "trip-sample-2", user_id: "demo2", title: "Gokarna beach chill", origin: "Bengaluru",
    destination: "Gokarna", dest_lat: 14.5479, dest_lng: 74.3188,
    start_date: `${year}-02-05`, end_date: `${year}-02-09`, budget_per_person: 12000,
    style: "relaxed", max_buddies: 3, notes: "Overnight bus from Bengaluru, shacks on Kudle.",
    created_at: "2026-10-02T00:00:00Z", owner: "demo2", member_count: 0,
  },
];
