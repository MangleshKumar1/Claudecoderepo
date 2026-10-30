import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deployment check: open /api/health after deploying.
 * Reports only whether settings are present (true/false), never their values.
 */
export function GET() {
  const checks = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    anthropic_api_key: Boolean(process.env.ANTHROPIC_API_KEY),
    map_style_url: Boolean(process.env.NEXT_PUBLIC_MAP_STYLE_URL),
  };
  const ready = checks.supabase_url && checks.supabase_anon_key;
  return NextResponse.json(
    { ok: ready, ai_planner: checks.anthropic_api_key, checks },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
