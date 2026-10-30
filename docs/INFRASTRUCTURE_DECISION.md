# Infrastructure decision: Supabase vs Cloudflare, and the lock-in worry

> I can't check live prices from here. Anything about plans and pricing below is a pattern to verify on the providers' pricing pages, not a quote.

## Short answer

1. **Stay on Supabase for the database, login and chat. Don't move to Cloudflare for those.**
2. **Do use Cloudflare for the parts it is genuinely good at:** photo/video storage (R2), DNS/CDN, and bot protection (Turnstile). These also reduce the biggest "surprise bill" risks.
3. **Reduce lock-in now, cheaply**, with the steps in "What to do now". Don't redesign anything yet.
4. **The real risk to this project is nobody using it, not the hosting bill.** Optimising infrastructure before you have users is the wrong place to spend time.

## Why not Cloudflare instead of Supabase?

Supabase is a managed **Postgres database + login + realtime + file storage** in one product. As far as I know, Cloudflare doesn't have an equivalent bundle:

| What the app needs | Supabase | Cloudflare equivalent |
|---|---|---|
| Relational database | Postgres | D1 (serverless SQLite). Different engine; no row-level security, weaker for geo queries. Workers can also connect to an external Postgres through Hyperdrive. |
| User accounts, email/phone login | Built in | No first-party app-login product (Cloudflare Access is for company staff). You'd add Auth.js, Clerk, or similar. |
| Who-can-see-what rules | Postgres row-level security (RLS), which is what our tested safety rules use | Rewrite as application code |
| Realtime chat | Realtime | Durable Objects/WebSockets: possible, but you build it |
| File storage | Storage | **R2: excellent**, and S3-compatible |
| Hosting the Next.js app | (n/a) | Workers/Pages via the OpenNext adapter: possible, Vercel is simpler today |

Switching the database to Cloudflare would mean rebuilding login, the authorization rules, chat and the database tests, which are the parts that took the most care in Phases 2-5. That is weeks of work for a saving you can't yet measure.

## Is the lock-in worry real?

Partly. What people mean when they say "Supabase becomes hard to leave":

| Lock-in point | How bad | In this project |
|---|---|---|
| Your data | **Low.** It's standard Postgres: `pg_dump` exports everything. | All schema is plain SQL files in `web/supabase/`. |
| RLS policies | Low-medium. Policies are standard Postgres, but they call `auth.uid()`, which is Supabase-specific. | Any Postgres can replicate `auth.uid()` with a function reading a per-request setting. |
| Client library calls (`supabase-js`) | **Medium.** This is where "hard to change" really comes from, when calls are scattered everywhere. | Mostly in one file, `web/lib/data.ts`. A few others call it directly: login page, header, `useUser`, `/api/plan`, `analytics.ts`. |
| Auth users | Medium. Password hashes live in `auth.users` and need an import path on the new provider. | Check your target provider supports bcrypt hash import before choosing it. |
| Realtime and Storage APIs | Medium | Chat uses Realtime (one component). No Supabase Storage use yet. |
| Self-hosting | Supabase is open source and can be self-hosted. | Fallback if the hosted bill ever becomes the problem. |

So: leaving later would take **days to a few weeks**, not months, provided the data access stays centralised. That is a real cost, but not a trap. Don't take my timing as a promise; it depends on how large the app is when you leave.

## What actually drives the bill (watch these)

I haven't verified current plan details, so check Supabase's pricing page. Typical drivers of a managed-Postgres bill are:

- **Active users** (monthly active users for login)
- **Database size** and compute size
- **Bandwidth / egress**, especially **photos and video**
- **Storage** volume
- **Realtime** messages and connections

Free plans commonly have limits and may pause inactive projects, so check before you invite real users. Photos and video are usually the largest cost for a travel app, which is why they go to R2 (below).

## What to do now (cheap, worth it)

1. **Media on Cloudflare R2, not Supabase Storage.** Store only the photo URL in the database. R2's pricing is built around not charging for egress; verify current terms. (Photo upload isn't built yet; the app currently takes a URL. When we build it, we'll use R2 with signed uploads from a server route.)
2. **Keep database calls in `web/lib/data.ts`.** New features go there. Where a page calls Supabase directly, leave a short comment so a future migration can find it.
3. **SQL files stay the source of truth.** Never change the live database by hand without saving a numbered file in `web/supabase/`.
4. **Avoid Supabase-only extras unless they pay for themselves.** Plain Postgres + PostGIS covers geo search (PostGIS is an extension you can enable in Supabase and any Postgres host).
5. **Put Cloudflare Turnstile on signup** (free bot protection) and use Cloudflare DNS in front of your domain.
6. **Cost tripwires.** Decide numbers now, e.g. "review hosting if the monthly bill passes ₹X or Y% of revenue", and check the Supabase usage page monthly.
7. **Backup drill, quarterly.** Run `pg_dump`, restore it into a throwaway database and confirm the app's tables are intact. A backup you've never restored is a hope, not a backup.

## If you ever need to leave (exit plan outline)

1. `pg_dump` the database.
2. Provision Postgres elsewhere (Neon, Railway, AWS RDS, or a self-hosted Supabase).
3. Move users: export `auth.users` and import into the new login system (confirm hash import first).
4. Replace `supabase-js` calls in `lib/data.ts` with API routes or a self-hosted PostgREST; swap Realtime for WebSockets/polling (chat already polls every 20 seconds as a fallback).
5. Re-run the SQL tests from Phases 3-5 against the new database. They are the safety net.

## Your Java / Spring Boot experience

A Spring Boot backend against the same Postgres is a valid later step, if you want to own more of the server logic (bookings, vendor panels, payments). Nothing here blocks it: the data is plain Postgres, and the web app can keep talking to it through the same `lib/data.ts` boundary. I picked Next.js + Supabase because it let us ship Phases 1-5 quickly and test them, not because Spring Boot is wrong.

## When would moving make sense?

- The hosted bill is clearly out of proportion to revenue or usage **and** the cost is in the database, not in media you could move to R2.
- You need something Supabase can't do (specific regions, compliance, custom extensions).
- You have a team that prefers to run its own infrastructure.

Until then, building and validating the product is worth far more than moving infrastructure.
