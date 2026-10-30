# Deploying TripMates (Vercel + Supabase)

Everything the app needs is in `web/`. This is a one-time setup of about 20 minutes.

> The repo currently has a single branch, `claude/serene-heisenberg-9304q9`, and no `main`. See step 3.

## 1. Supabase (database + login)

1. Create a project at https://supabase.com (pick the region closest to your users, e.g. Mumbai).
2. **SQL editor**: run these files from `web/supabase/`, in order, **once each**:
   1. `schema.sql`
   2. `phase2_trips.sql`
   3. `phase3_safety.sql`
   4. `phase4_itineraries.sql`
   5. `phase5_community.sql`
3. **Project Settings -> API**: copy the **Project URL** and the **anon public** key. (Never use the `service_role` key in this app.)
4. **Authentication -> Providers**: keep Email enabled. For phone verification, enable Phone and connect an SMS provider (Twilio, MessageBird, Vonage...). SMS costs money.
5. After you know your site URL (step 4), set **Authentication -> URL Configuration**: Site URL = your Vercel URL, and add the same URL (plus `http://localhost:3000`) to Redirect URLs. Without this, the confirmation emails link to the wrong place.
6. Email sending: Supabase's built-in email is rate-limited and meant for testing. Before real users, set up custom SMTP (Authentication -> SMTP Settings) with a provider like Resend, Brevo or Amazon SES.

## 2. Anthropic (AI planner)

1. Create an API key at https://console.anthropic.com.
2. Set a **monthly spend limit** there before you share the app. A bug or a bad actor can otherwise run up a bill. The app also caps each user at `AI_PLANS_PER_DAY` plans (default 10).

## 3. Vercel

1. In Vercel: **Add New -> Project**, and import `MangleshKumar1/Claudecoderepo` (you may need to grant Vercel access to that repo under GitHub integration settings).
2. **Root Directory: `web`** (important; the app is not at the repo root). Framework preset: Next.js (auto-detected).
3. **Production Branch**: Vercel uses the repo's default branch. Because there is no `main` yet, either:
   - in the project's **Settings -> Git -> Production Branch**, enter `claude/serene-heisenberg-9304q9`, or
   - create a `main` branch from it on GitHub and make it the default (ask me and I'll do it).
4. **Environment Variables** (Settings -> Environment Variables, all environments):

   | Name | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your project URL | public, safe to expose |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | public by design; your data is protected by row-level security |
   | `ANTHROPIC_API_KEY` | your key | **secret, server-only**. Do not prefix with `NEXT_PUBLIC_` |
   | `ANTHROPIC_MODEL` | optional | default `claude-opus-5-5`; `claude-sonnet-5-5` is cheaper |
   | `AI_PLANS_PER_DAY` | optional | default 10 |
   | `NEXT_PUBLIC_MAP_STYLE_URL` | recommended | a real map style, see step 5 |

   `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy after changing them**.
5. Click **Deploy**.

## 4. Check it works

1. Open `https://YOUR-APP.vercel.app/api/health`. You want `{"ok":true,"ai_planner":true,...}`. It shows only true/false per setting, never values.
2. Go back to Supabase step 5 and set the Site URL / Redirect URLs to your Vercel URL.
3. Smoke test, in order: sign up and confirm the email, pin a place, post a trip, write a review, create an itinerary with the AI planner (takes up to about a minute).
4. A plan call can take close to a minute, and the route allows up to 120 seconds. If plans time out on your Vercel plan, check the maximum function duration allowed for your plan and reduce days per plan or lower `maxDuration` in `app/api/plan/route.ts`.

## 5. Before real users

- **Map tiles**: the default MapLibre demo tiles are for development only. Get a free key from MapTiler or Stadia Maps and set `NEXT_PUBLIC_MAP_STYLE_URL` (example in `.env.example`). Check their free-tier terms.
- **Custom SMTP** for emails (see Supabase step 6).
- **Custom domain**: Vercel -> Settings -> Domains, then update the Supabase Site URL.
- **Backups**: check your Supabase plan's backup options.
- **Moderation**: reports land in the Supabase table `reports` (`status = open`). Check it regularly, since there is no admin screen yet.
- **Legal pages**: privacy policy and terms (you collect emails, optional phone verification and user content). In India, review the DPDP Act obligations.
- **Spend alerts**: Anthropic spend limit, Vercel usage alerts, Supabase usage page.

## 5b. Reading your numbers (analytics)

In Supabase, open the **SQL editor** and run `select * from metrics_validation;` (the validation targets in `docs/PRODUCT_STRATEGY.md`) and `select * from metrics_daily_active;`. Nobody can read these through the app. Mention analytics in your privacy policy.

## 6. Day-to-day

- Every push to the production branch redeploys; other branches and pull requests get preview URLs. Preview deployments use the same Supabase project unless you set separate preview-only env vars. Use a separate Supabase project for testing if you want to avoid touching real data.
- GitHub Actions (`.github/workflows/ci.yml`) typechecks and builds on every push, so a broken change is caught before Vercel deploys it.
- Database changes: add a new numbered SQL file under `web/supabase/` and run it in the SQL editor. Never edit and re-run old files.

## What this setup does NOT include yet

- No staging environment, error tracking (e.g. Sentry) or analytics. Add analytics early: you need to see whether people come back, since that's what validates the idea.
- Rate limiting beyond the AI daily cap. Supabase and Vercel have platform-level protections; add more if you see abuse.
