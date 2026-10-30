import type { Category } from "./types";

export const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  beach: { label: "Beach", emoji: "🏖️" },
  mountain: { label: "Mountain", emoji: "⛰️" },
  trek: { label: "Trek", emoji: "🥾" },
  food: { label: "Food", emoji: "🍜" },
  city: { label: "City", emoji: "🏙️" },
  culture: { label: "Culture", emoji: "🏛️" },
  nature: { label: "Nature", emoji: "🌿" },
  stay: { label: "Stay", emoji: "🛏️" },
  offbeat: { label: "Offbeat", emoji: "🧭" },
  waterfall: { label: "Waterfall", emoji: "💧" },
  viewpoint: { label: "Viewpoint", emoji: "🌅" },
  rest_stop: { label: "Rest stop", emoji: "☕" },
};

export const catLabel = (c: string) => CATEGORY_META[c as Category]?.label ?? c.replace("_", " ");
export const catEmoji = (c: string) => CATEGORY_META[c as Category]?.emoji ?? "📍";
