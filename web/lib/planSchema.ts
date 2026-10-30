import { z } from "zod";

export const TIMES = ["morning", "afternoon", "evening", "night"] as const;

export const PlanRequest = z.object({
  destination: z.string().trim().min(2).max(120),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  days: z.number().int().min(1).max(10),
  budget_per_person: z.number().min(0).max(10_000_000).nullable().optional(),
  travellers: z.number().int().min(1).max(20).optional(),
  style: z.enum(["budget", "comfort", "adventure", "relaxed", "mixed"]).default("mixed"),
  interests: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  origin: z.string().trim().max(120).optional(),
});
export type PlanRequestT = z.infer<typeof PlanRequest>;

// What the model must return. Kept flat and bounded so output is reliable and cheap.
export const PlanOutput = z.object({
  title: z.string(),
  summary: z.string(),
  days: z.array(
    z.object({
      day: z.number().int(),
      theme: z.string(),
      items: z.array(
        z.object({
          time_of_day: z.enum(TIMES),
          title: z.string(),
          description: z.string(),
          est_cost_inr: z.number().nullable(),
          lat: z.number().nullable(),
          lng: z.number().nullable(),
          community_place_id: z.string().nullable(),
        }),
      ),
    }),
  ),
  packing_tips: z.array(z.string()),
  safety_notes: z.array(z.string()),
});
export type PlanOutputT = z.infer<typeof PlanOutput>;

/** The cleaned plan returned to the browser. */
export type Plan = {
  title: string;
  summary: string;
  days: {
    day: number;
    theme: string;
    items: {
      time_of_day: (typeof TIMES)[number];
      title: string;
      description: string;
      est_cost: number | null;
      lat: number | null;
      lng: number | null;
      place_id: string | null;
    }[];
  }[];
  packing_tips: string[];
  safety_notes: string[];
  model_note: string;
};

/** Safety notes and packing tips flattened to plain text for storage. */
export function planExtraNotes(plan: Plan): string {
  const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
  const parts = [] as string[];
  if (plan.safety_notes.length) parts.push(`Safety\n${list(plan.safety_notes)}`);
  if (plan.packing_tips.length) parts.push(`Packing\n${list(plan.packing_tips)}`);
  return parts.join("\n\n").slice(0, 3000);
}
