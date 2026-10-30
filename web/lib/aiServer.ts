import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export type AiKind = "search" | "summary" | "identify" | "route";

const LIMITS: Record<AiKind, { env: string; fallback: number }> = {
  search: { env: "AI_SEARCHES_PER_DAY", fallback: 20 },
  summary: { env: "AI_SUMMARIES_PER_DAY", fallback: 20 },
  identify: { env: "AI_IDENTIFY_PER_DAY", fallback: 10 },
  route: { env: "ROUTES_PER_DAY", fallback: 30 }, // road routing (not AI, but shares the same login + daily-cap gate)
};

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export type AiGate = {
  sb: SupabaseClient;
  uid: string;
  /**
   * Counts one use against the caller's daily cap. Call it right before the AI request, after the input has
   * been validated, so rejected requests don't use up the allowance. Returns an error response if over the cap.
   */
  reserve: () => Promise<NextResponse | null>;
};

/** Shared gate for the AI routes: the feature must be configured and the caller must be logged in. */
export async function guardAi(req: Request, kind: AiKind): Promise<AiGate | NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (kind !== "route" && !process.env.ANTHROPIC_API_KEY) return fail("This AI feature isn't set up yet (missing ANTHROPIC_API_KEY).", 503);
  if (!url || !anon) return fail("Supabase is not configured.", 503);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail("Please log in to use this feature.", 401);
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return fail("Please log in again.", 401);

  const uid = data.user.id;
  const reserve = async () => {
    const limit = Number(process.env[LIMITS[kind].env] || LIMITS[kind].fallback);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await sb.from("ai_usage").select("id", { count: "exact", head: true }).eq("kind", kind).gte("created_at", since);
    if ((count ?? 0) >= limit) return fail(`Daily limit reached (${limit} per day for this feature). Try again tomorrow.`, 429);
    const { error: logErr } = await sb.from("ai_usage").insert({ user_id: uid, kind });
    return logErr ? fail("Could not start the request.", 500) : null;
  };
  return { sb, uid, reserve };
}

/** Calls Claude and returns output validated against `schema`, or an error response. */
export async function askClaude<S extends z.ZodType>(opts: {
  schema: S; system: string; content: Anthropic.Beta.BetaContentBlockParam[]; effort?: "low" | "medium" | "high"; maxTokens?: number;
}): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opts.effort ?? "low", format: zodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.content }],
    });
    if (response.stop_reason === "refusal") return { ok: false, res: fail("The AI couldn't help with this request. Try rephrasing it.", 422) };
    if (response.stop_reason === "max_tokens" || !response.parsed_output) return { ok: false, res: fail("The AI's answer came back incomplete. Please try again.", 502) };
    return { ok: true, data: response.parsed_output as z.infer<S> };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, res: fail("The AI is busy. Please try again in a minute.", 429) };
    if (e instanceof Anthropic.AuthenticationError) { console.error("Anthropic authentication failed: check ANTHROPIC_API_KEY"); return { ok: false, res: fail("This AI feature is misconfigured.", 503) }; }
    if (e instanceof Anthropic.APIError) { console.error("Anthropic API error", e.status, e.message); return { ok: false, res: fail("The AI had a problem. Please try again.", 502) }; }
    console.error("AI call failed", e);
    if (e instanceof Error && /parse structured output/i.test(e.message)) return { ok: false, res: fail("The AI returned something unreadable. Please try again.", 502) };
    return { ok: false, res: fail("Something went wrong. Please try again.", 500) };
  }
}

export const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
