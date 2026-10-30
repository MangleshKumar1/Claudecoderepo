import type { Activity } from "./types";

export type Badge = { id: string; emoji: string; name: string; text: string; level: 0 | 1 | 2 | 3 };
const LEVELS = ["", "Bronze", "Silver", "Gold"] as const;
export const levelName = (l: number) => LEVELS[l] ?? "";

const tier = (n: number, t: [number, number, number]): 0 | 1 | 2 | 3 => (n >= t[2] ? 3 : n >= t[1] ? 2 : n >= t[0] ? 1 : 0);

/** Badges are computed from activity counts, so they can't be faked or edited. */
export function computeBadges(a: Activity, phoneVerified: boolean): Badge[] {
  const all: Badge[] = [
    { id: "pathfinder", emoji: "📍", name: "Pathfinder", text: "Pinned places for others to find", level: tier(a.pins, [1, 5, 20]) },
    { id: "voice", emoji: "✍️", name: "Honest voice", text: "Wrote reviews with real prices and pros/cons", level: tier(a.reviews, [1, 10, 40]) },
    { id: "photog", emoji: "📷", name: "Photographer", text: "Shared place photos", level: tier(a.photos, [1, 10, 40]) },
    { id: "scout", emoji: "🔦", name: "Scout", text: "Reported current conditions", level: tier(a.condition_reports, [1, 5, 20]) },
    { id: "storyteller", emoji: "📖", name: "Storyteller", text: "Posted travel stories", level: tier(a.posts, [1, 8, 30]) },
    { id: "curator", emoji: "🗂️", name: "Curator", text: "Built public collections", level: tier(a.collections, [1, 3, 10]) },
    { id: "influence", emoji: "🌟", name: "Trusted guide", text: "Followed by other travellers", level: tier(a.followers, [5, 25, 100]) },
  ];
  const earned = all.filter((b) => b.level > 0);
  if (phoneVerified) earned.unshift({ id: "verified", emoji: "✅", name: "Verified", text: "Phone number confirmed", level: 1 });
  return earned;
}

/** Contribution points (for a simple level, not a leaderboard of wealth or status). */
export function reputation(a: Activity): { points: number; level: string; next: number | null } {
  const points = a.pins * 10 + a.reviews * 5 + a.photos * 2 + a.condition_reports * 3 + a.posts * 2 + a.collections * 5 + Math.min(a.followers, 100);
  const steps: [number, string][] = [[300, "Local legend"], [100, "Pathfinder"], [20, "Explorer"], [0, "Newcomer"]];
  const idx = steps.findIndex(([min]) => points >= min);
  const level = steps[idx][1];
  const next = idx === 0 ? null : steps[idx - 1][0];
  return { points, level, next };
}
