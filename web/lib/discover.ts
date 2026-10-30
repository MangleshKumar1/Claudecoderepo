import { distanceKm } from "./geo";
import type { Category, Place } from "./types";

export type Filters = { from: { lat: number; lng: number }; maxKm: number; category: Category | "all"; maxBudgetPerDay: number | null };
export type Match = { place: Place; km: number };

/**
 * Places within `maxKm` of the starting point. If a budget is set, only places where travellers
 * reported a typical daily cost at or under it are included (places with no cost data can't be judged).
 */
export function discover(places: Place[], f: Filters): Match[] {
  return places
    .filter((p) => f.category === "all" || p.category === f.category)
    .filter((p) => f.maxBudgetPerDay == null || (p.typical_cost_per_day != null && p.typical_cost_per_day <= f.maxBudgetPerDay))
    .map((place) => ({ place, km: distanceKm(f.from.lat, f.from.lng, place.lat, place.lng) }))
    .filter((m) => m.km <= f.maxKm)
    .sort((a, b) => a.km - b.km);
}

export function pickRandom<T>(items: T[], rnd: () => number = Math.random): T | null {
  return items.length ? items[Math.floor(rnd() * items.length)] : null;
}
