# YORVIA Web (Phases 1-12)

> Setup steps, every setting and troubleshooting are in the **[root README](../README.md)**. This file has developer notes.

Next.js (App Router, TypeScript) + Supabase + MapLibre.

**Phase 1 features:** accounts, map explorer with category filters, pin a place (click the map), place pages, reviews with pros/cons, price paid, value and safety ratings, save places.

**Phase 2 features:** post a trip (destination on the map, dates, budget, style, group size), see trips that match yours (destination within 75 km and overlapping dates, ranked by shared days, distance and style), ask to join, organiser approves or declines, and a members-only group chat with realtime updates.

**Phase 3 (safety) features:** public traveller profiles (home city, languages, bio, username), phone and email verification badges, buddy ratings after a trip ends, report and block, safety tips, and a private reports table for moderation.

**Phase 4 features:** itinerary builder (days, timed activities, per-person costs, map markers, reorder/edit/delete) and an AI trip planner. Itineraries can be private, public, or linked to a trip so everyone in the travel group can edit them together.

**Phase 5 features:** richer place pages (natural beauty, accessibility, cleanliness, safety, value and crowd ratings, "last visited" date, current-conditions reports), trip expense splitting, "discover along a route", share buttons, new place types (waterfall, viewpoint, rest stop), and first-party analytics for your validation metrics.

**Phase 6 features:** photo upload to a Cloudflare R2 bucket (browser-side compression, location data stripped, signed short-lived upload links, per-user caps, report/delete), place galleries, and cover photos on cards. Setup: [../docs/CLOUDFLARE_R2_SETUP.md](../docs/CLOUDFLARE_R2_SETUP.md). All Cloudflare resources are named `yorvia-…`.

**Phase 7 features:** group polls inside trips. Anyone on the trip can start a poll (destination, dates, stay, activity...), suggest options, and vote once (changeable until closed). The poll's creator or the trip organiser can close, reopen or delete it. Polls and votes are visible only to the trip group.

**Phases 8-11:** social feed, follows, collections, badges (computed from activity, so they can't be edited); weather (Open-Meteo, no key), fuel estimate, Discover, SOS and private emergency contacts; AI search, review summaries and photo recognition; business directory with enquiries, admin panel, optional Google login. Details, setup and the full list of settings are in the **[root README](../README.md)**.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys the app runs in **demo mode** with read-only sample data.

## Enable accounts, pins and reviews

1. Create a free project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/phase2_trips.sql`, then `supabase/phase3_safety.sql`, then `supabase/phase4_itineraries.sql`, then `supabase/phase5_community.sql`, then `supabase/phase6_photos.sql`, then `supabase/phase7_polls.sql` (run each file once; already have Phase 1 set up? Just run `phase2_trips.sql`, `phase3_safety.sql`, `phase4_itineraries.sql`, `phase5_community.sql`, `phase6_photos.sql` and `phase7_polls.sql`; phase 2 also fixes the review author link)
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings -> API)
4. In Authentication -> Providers, keep Email enabled (disable "Confirm email" while testing if you like)
5. For the AI planner, add `ANTHROPIC_API_KEY` to `.env.local` (see below)
6. Restart `npm run dev`

Row-level security is on: anyone can read, only the owner can change their own places, reviews and saves.

## Notes

- The map uses MapLibre's demo tiles (`components/Map.tsx`). Switch to MapTiler, Stadia or Mapbox before launch.
- Photo upload is a URL field for now. Supabase Storage upload is next.
- Safety by design: chat is visible only to the organiser and approved travellers, the organiser approves every join request, and group size is enforced in the database.
- Chat uses Supabase Realtime (enabled by `phase2_trips.sql`) and also polls every 20 seconds as a fallback.
- Next up: traveller profiles and verification, ratings for travel buddies, report/block, itineraries.

## Safety model (Phase 3)

- **Verification can't be faked.** Users can edit only their name, username, bio, city and languages. The `phone_verified` / `email_verified` flags are copied from Supabase Auth by a database trigger. Phone numbers are never exposed, only the badge.
- **Phone verification needs an SMS provider.** In Supabase: Authentication -> Providers -> Phone, then connect Twilio, MessageBird, Vonage or similar (SMS costs money; test numbers are available for development).
- **Ratings** are allowed only after a trip's end date, only between people who were on that trip together, and only as yourself. Ratings are public.
- **Blocking** hides the blocked person's chat messages from you (they aren't told) and stops them requesting to join your trips.
- **Reports** are visible only to the person who filed them. Review them in the Supabase dashboard (Table Editor -> `reports`, filter `status = open`) and update `status`. There is no in-app admin panel yet.
- Verified through a local Postgres test of the row-level-security rules: self-verification denied, early/forged/stranger ratings denied, blocked users can't join, blocker doesn't see blocked messages, trip capacity enforced.

## AI planner (Phase 4)

- The browser calls `POST /api/plan` (`app/api/plan/route.ts`). The route runs on the server, so your Anthropic key is never exposed.
- **Cost controls:** only logged-in users can call it, days are capped at 10, and each user gets `AI_PLANS_PER_DAY` plans per 24 hours (default 10, counted in `ai_plan_log`; a failed attempt still counts). The default model is `claude-opus-5-5`; set `ANTHROPIC_MODEL=claude-sonnet-5-5` for a cheaper, faster option. A plan is roughly a few thousand output tokens, so check current pricing and set a spend limit in the Anthropic console.
- The model returns a schema-validated plan. The server then discards unknown community-pin ids, rounds costs, drops impossible coordinates, and trims extra days before anything is saved.
- Real community pins near the destination (from `places`) are given to the model so it can reuse them. User text and pins are passed as untrusted data, not instructions.
- Refusals trigger Anthropic's server-side fallback (`fallbacks: "default"`). If the response is still declined, the user sees a friendly message.
- AI output is a starting point: costs and opening hours are estimates, and the UI says so.
- Tested with mock Supabase/Anthropic servers (auth, validation, daily cap, refusal, rate-limit, clamping, request shape) and a local Postgres run of the row-level-security rules. Not yet tested against the live Anthropic API or a real Supabase project.
- Collaboration rules: the owner controls title, visibility, linking and deletion. Approved members of the linked trip can add, edit, reorder and delete activities. Removing someone from the trip removes their access. Public itineraries are view-only for everyone else.

## Phase 5 notes

- **Analytics** (`lib/analytics.ts`, `events` table): the browser logs named events (page views, pins, reviews, saves, trips, join requests, itineraries, AI plans, expenses, shares). Events are write-only for clients. Read your numbers in the Supabase SQL editor: `select * from metrics_validation;` and `select * from metrics_daily_active;`. Respects Do Not Track / Global Privacy Control. Anyone can insert events, so a determined person could add junk; the allowed event names and a size limit keep it bounded, and the numbers are for guidance, not billing.
- **Expense splitting** is equal-split only and tracks who owes whom. It does not move money. Money paid by someone who has left the trip is ignored.
- **Along a route** (`/route`) uses a straight line between two points, not road routes, and lists community pins inside a corridor in the order you'd pass them.
- **Tested:** the split and corridor maths (including uneven paise and clamping), and a local Postgres run of all five SQL files covering category rules, rating bounds, condition-report and expense access, the write-only analytics rules, locked metrics views and the metrics calculations. Not tested in a real browser or against a real Supabase project.

## Phases 8-11 notes

- **AI routes** (`app/api/ai/*`, `lib/aiServer.ts`): login required; input is validated first; the daily cap is only used right before the AI call (rejected requests don't use it); prompts treat user text as untrusted data; the photo route never identifies people and strips guesses when the AI says it isn't a place; all output is validated and sanitised before it reaches the browser.
- **Admin** is decided by the `admins` table in the database (no way to edit it from the app). Admin-only actions are enforced by row-level-security policies and `security definer` functions, not by hiding buttons.
- **Directory enquiries** are visible only to the traveller and the business owner. Not even admins can read them.
- **Weather** calls Open-Meteo straight from the browser (no key). Alerts are guidance, not official warnings.
- **Offline**: `public/sw.js` only caches static assets and an offline page. Saved itineraries are stored in the browser's `localStorage` and cleared on logout. Pages and user data are never cached by the service worker.
- **Tested:** every SQL file applied in order to a local Postgres; row-level-security rules tested as different users for each phase (all earlier suites re-run on the final schema); AI routes against mock Supabase and Claude servers; pure logic (split, geo, fuel, weather, discover) with unit checks; compression and screenshots in headless Chromium. **Not tested** against real Supabase, the live Claude API, real Cloudflare R2, the Open-Meteo service, Google OAuth, or on real phones.

## Phase 12 notes

- **Suspension** is enforced by database triggers on 24 tables that create content, so it can't be bypassed by calling the API directly. Suspended people can still read.
- **Notifications** are created by database triggers (not by app code), so they can't be forged, and users can only read them and mark them read. People who blocked the actor are skipped. The bell checks once a minute and when you return to the tab.
- **Road routing** (`app/api/route/route.ts`) proxies OpenRouteService so the key stays on the server. It needs login, has a daily cap, validates the reply, and shortens the line to 400 points. Without `ORS_API_KEY` the app uses the straight line.
- **Backups**: `scripts/backup-db.sh`, `scripts/restore-db.sh`, `scripts/plain-postgres-auth-shim.sql`. The restore loads tables parents-first, resets ID counters, switches the app's own triggers off while loading, and runs in one transaction. Tested: recovery after data loss, a deliberately failing restore (changes nothing), and a move onto a fresh plain Postgres with accounts.
