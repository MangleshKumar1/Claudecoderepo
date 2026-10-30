import type { Trip } from "./types";

const DAY = 86_400_000;

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(bLat - aLat) / 2) ** 2 +
    Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Number of shared days (inclusive); 0 if the ranges don't overlap. */
export function overlapDays(a: Trip, b: Trip): number {
  const start = Math.max(Date.parse(a.start_date), Date.parse(b.start_date));
  const end = Math.min(Date.parse(a.end_date), Date.parse(b.end_date));
  return end < start ? 0 : Math.round((end - start) / DAY) + 1;
}

export type TripMatch = { trip: Trip; overlap: number; distance: number; score: number };

/**
 * Trips going to roughly the same place (default within 75 km) on overlapping dates.
 * Score favours more shared days, closer destinations and similar travel style.
 */
export function findMatches(mine: Trip, others: Trip[], maxKm = 75): TripMatch[] {
  return others
    .filter((t) => t.id !== mine.id && t.user_id !== mine.user_id)
    .map((trip) => {
      const overlap = overlapDays(mine, trip);
      const distance = distanceKm(mine.dest_lat, mine.dest_lng, trip.dest_lat, trip.dest_lng);
      const myLen = Math.max(1, overlapDays(mine, mine));
      const score =
        (overlap / myLen) * 60 + (1 - Math.min(distance, maxKm) / maxKm) * 30 + (trip.style === mine.style ? 10 : 0);
      return { trip, overlap, distance, score };
    })
    .filter((m) => m.overlap > 0 && m.distance <= maxKm)
    .sort((a, b) => b.score - a.score);
}
