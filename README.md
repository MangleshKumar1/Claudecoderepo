# YORVIA

A travel community platform. Pin beautiful places on a map, read honest reviews with real prices and current conditions, find people going to the same place, plan trips together (chat, polls, expenses, itineraries), and get an AI-planned itinerary. Booking comes later.

**Live app code:** `web/` (Next.js + Supabase + Cloudflare R2 + Claude API) · **Hosting:** Vercel

> You asked for everything needed to finish setup in one place. This README is that checklist. Tick the boxes top to bottom. Nothing here needs coding.

## Contents
1. [What you need](#1-what-you-need)
2. [Setup checklist](#2-setup-checklist-do-in-this-order)
3. [Every setting in one table](#3-every-setting-in-one-table)
4. [Logging in: your first user and admin](#4-logging-in-your-first-user-and-admin)
5. [Troubleshooting](#5-troubleshooting)
6. [Before real users arrive](#6-before-real-users-arrive)
7. [Running it on your own computer](#7-running-it-on-your-own-computer)
8. [What's built](#8-whats-built)
9. [More documents](#9-more-documents)

---

## 1. What you need

| Account | Used for | Cost note (verify on their pricing pages) |
|---|---|---|
| **GitHub** (you have it) | The code | Free |
| **Vercel** (you have it) | Hosts the website | Free plan available |
| **Supabase** | Database, login, chat | Free plan available, with limits |
| **Cloudflare** (you have it) | Photo storage (R2). **Everything for this app is named `yorvia-…`; your other Cloudflare projects are never touched** | R2 has a free allowance; may ask for a payment method |
| **Anthropic** | The AI trip planner | Pay as you go. Set a spend limit |
| **MapTiler** (or Stadia Maps) | Map tiles for production | Free tier available |
| **An SMS provider** (Twilio/MessageBird/Vonage) | Phone verification badges. Optional | Costs money per SMS |
| **An email sender** (Resend/Brevo/SES) | Reliable signup emails. Before real users | Free tiers available |

Keep every key and secret in a password manager. **Never paste secrets into GitHub, chat, or code.** Secrets belong only in Vercel's Environment Variables (and your local `web/.env.local`, which is git-ignored).

---

## 2. Setup checklist (do in this order)

### Step 1: Supabase (database and login)

- [ ] Create a project at https://supabase.com. Choose a region near your users (for India, Mumbai if offered). Save the database password.
- [ ] Open **SQL Editor -> New query**. Run these 7 files from `web/supabase/` **in this order, once each** (open the file on GitHub, copy all, paste, Run):

  | # | File | What it adds |
  |---|---|---|
  | 1 | `schema.sql` | Accounts/profiles, places (pins), reviews, saves |
  | 2 | `phase2_trips.sql` | Trips, matching, join requests, group chat |
  | 3 | `phase3_safety.sql` | Verification badges, buddy ratings, report and block |
  | 4 | `phase4_itineraries.sql` | Itineraries and the AI usage log |
  | 5 | `phase5_community.sql` | Dimension ratings, condition reports, expenses, analytics |
  | 6 | `phase6_photos.sql` | Photo records |
  | 7 | `phase7_polls.sql` | Group polls |

  Running a file twice gives "already exists" errors. That's harmless, but don't do it on purpose.
- [ ] **Project Settings -> API**: copy two values for later:
  - **Project URL** -> becomes `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public key** -> becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Never use the `service_role` key in this app.
- [ ] **Authentication -> Providers**: leave **Email** enabled.
- [ ] **Authentication -> URL Configuration** (do this after Step 5 gives you your site address):
  - Site URL = your Vercel address (later your own domain)
  - Redirect URLs: add the same address, plus `http://localhost:3000`
- [ ] While testing only: **Authentication -> Providers -> Email -> turn off "Confirm email"** so sign-ups work instantly. Turn it back on before real users.
- [ ] Optional, for phone badges: **Authentication -> Providers -> Phone**, then connect an SMS provider.

### Step 2: Anthropic (AI planner)

- [ ] Create an API key at https://console.anthropic.com -> becomes `ANTHROPIC_API_KEY` (secret).
- [ ] In the console, **set a monthly spend limit** before anyone else uses the app.

### Step 3: Cloudflare R2 (photo uploads). All names start with `yorvia`

Full detail with the CORS text to paste: **[docs/CLOUDFLARE_R2_SETUP.md](docs/CLOUDFLARE_R2_SETUP.md)**. Summary:

- [ ] R2 Object Storage -> **Create bucket** named `yorvia-media`.
- [ ] Make images viewable: Settings -> **Custom Domains** -> `media.your-domain.com` (recommended), or enable the `r2.dev` address for testing only. -> becomes `NEXT_PUBLIC_MEDIA_BASE_URL`.
- [ ] Bucket -> Settings -> **CORS Policy**: paste the JSON from the R2 guide, with your real site addresses.
- [ ] R2 -> **Manage API Tokens -> Create**: name `yorvia-r2-media`, **Object Read & Write**, **only the `yorvia-media` bucket**. Copy the Access Key ID and Secret (shown once) -> `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- [ ] Copy your **Account ID** from the R2 overview page -> `R2_ACCOUNT_ID`.

### Step 4: Map tiles for production

- [ ] Create a free key at https://www.maptiler.com (or Stadia Maps).
- [ ] Your style address looks like `https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY` -> becomes `NEXT_PUBLIC_MAP_STYLE_URL`. Without it the app uses demo tiles, which are for development only.

### Step 5: Vercel (the website)

- [ ] **Add New -> Project**, import `MangleshKumar1/Claudecoderepo`.
- [ ] **Root Directory: `web`** (important).
- [ ] Settings -> Git -> **Production Branch: `main`**.
- [ ] Settings -> **Environment Variables**: add every row marked "Required" or "Recommended" in the [table below](#3-every-setting-in-one-table), for **Production** (and Preview if you test there). Mark secrets as **Sensitive**.
- [ ] **Deploy** (or **Redeploy** after changing any variable. `NEXT_PUBLIC_…` values are baked in at build time, so changes only appear after a redeploy).
- [ ] Go back to Supabase **URL Configuration** and put in your Vercel address.

### Step 6: Check it works

- [ ] Open `https://YOUR-SITE/api/health`. You want:
  ```json
  {"ok":true,"ai_planner":true,"photo_uploads":true, ...}
  ```
  `false` tells you which part is missing. It never shows secret values.
- [ ] The yellow **"Demo mode"** banner at the top of the site must be **gone**. If it shows, Supabase settings are missing; see Troubleshooting.
- [ ] Sign up, pin a place with a photo, post a trip, start a poll, and generate an AI itinerary.

---

## 3. Every setting in one table

Where to set them: **Vercel -> Project -> Settings -> Environment Variables**, and your local `web/.env.local` for development.

| Name | Required? | Where to get it | Secret? | Example / notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Supabase -> Project Settings -> API -> Project URL | No | `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Supabase -> Project Settings -> API -> anon public | No (public by design; data is protected by database rules) | long `eyJ…` text |
| `ANTHROPIC_API_KEY` | Required for the AI planner | console.anthropic.com | **Yes** | `sk-ant-…` |
| `ANTHROPIC_MODEL` | Optional | Model id | No | default `claude-opus-5-5`; `claude-sonnet-5-5` is cheaper |
| `AI_PLANS_PER_DAY` | Optional | You choose | No | default `10` per user per day |
| `R2_ACCOUNT_ID` | Required for photos | Cloudflare R2 overview | Treat as private | |
| `R2_ACCESS_KEY_ID` | Required for photos | R2 token `yorvia-r2-media` | **Yes** | |
| `R2_SECRET_ACCESS_KEY` | Required for photos | R2 token `yorvia-r2-media` | **Yes** | shown only once |
| `R2_BUCKET` | Required for photos | The bucket you created | No | `yorvia-media` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Required for photos | Your bucket's public address | No | `https://media.your-domain.com`, no trailing slash |
| `UPLOADS_PER_DAY` | Optional | You choose | No | default `30` per user per day |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Recommended | MapTiler / Stadia | The key inside it is visible in the browser; restrict it by domain in their dashboard | `https://api.maptiler.com/maps/streets-v2/style.json?key=…` |

Not Vercel settings, but also configured by you:

| Where | What |
|---|---|
| Supabase -> Authentication -> URL Configuration | Site URL and Redirect URLs |
| Supabase -> Authentication -> SMTP Settings | Your email sender, before real users |
| Supabase -> Authentication -> Providers -> Phone | SMS provider, optional |
| Cloudflare R2 -> bucket -> CORS Policy | Allowed site addresses for uploads |
| Anthropic console | Monthly spend limit |

---

## 4. Logging in: your first user and admin

**There is no built-in username or password.** You create your own account:

1. (Needs Supabase set up first, see Step 1.) On the site click **Log in -> "New here? Create an account"**, and sign up with **your email and a password you choose** (6+ characters).
2. If "Confirm email" is on, click the link Supabase emails you. (While testing you can turn that off, see Step 1.)
3. Log in with the same email and password.

**Alternative, no email needed:** Supabase dashboard -> **Authentication -> Users -> Add user -> Create new user**, enter an email and password, and tick **Auto Confirm User**. Then log in on the site with those.

**Your "user id"** is an automatic long ID (a UUID like `3f2b…`). Find it in Supabase -> Authentication -> Users. You never type it anywhere.

**Admin:** the app has no admin screen or admin accounts yet. Being the admin means having access to the **Supabase dashboard**:
- Reports from users: Table Editor -> `reports` (filter `status = open`)
- Your growth numbers: SQL Editor -> `select * from metrics_validation;`
- Removing a user's content: delete the row in the relevant table (and the file in Cloudflare R2 for photos)

---

## 5. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Yellow banner **"Demo mode: showing sample data"** and login does nothing | The two Supabase settings are missing in that deployment. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, then **Redeploy**. Check `/api/health`. On your own computer, create `web/.env.local` (see section 7) and restart |
| Signup works but the confirmation email goes to the wrong place or never arrives | Set Supabase URL Configuration (Step 1). Supabase's built-in email is rate-limited; set up your own sender before real users |
| "Invalid login credentials" | Wrong password, or the email isn't confirmed yet |
| AI planner says it isn't set up (503) | `ANTHROPIC_API_KEY` missing in Vercel, or you haven't redeployed |
| AI planner says daily limit reached | `AI_PLANS_PER_DAY` per user. Raise it, or wait 24 hours |
| Photo upload fails with a CORS message in the browser console | Fix the bucket's CORS Policy: add your exact site address (including `https://`, no trailing slash) |
| Photos upload but don't display | `NEXT_PUBLIC_MEDIA_BASE_URL` wrong, or the bucket isn't public yet; open the image address directly to test. Redeploy after changing it |
| "Photo uploads aren't switched on" | `NEXT_PUBLIC_MEDIA_BASE_URL` isn't set (or you haven't redeployed) |
| Map looks plain or tiles don't load | Set `NEXT_PUBLIC_MAP_STYLE_URL` |
| A SQL file errors with "already exists" | You ran it before. Harmless |
| A change doesn't appear after editing a `NEXT_PUBLIC_…` value | Redeploy; those values are fixed at build time |

---

## 6. Before real users arrive

- [ ] Real map tiles (Step 4)
- [ ] Your own email sender in Supabase, "Confirm email" turned back **on**
- [ ] Anthropic monthly spend limit set; Cloudflare billing alert set; Vercel usage alerts
- [ ] Privacy policy and terms of use (you collect emails, optional phone verification, user content and analytics; tell users to upload only photos they took). In India, check the DPDP Act obligations
- [ ] A custom domain (Vercel -> Domains), then update Supabase URL Configuration and the R2 CORS list
- [ ] Check Supabase's backup options for your plan
- [ ] Decide how you'll review reports (Supabase -> `reports`)
- [ ] Read [docs/INFRASTRUCTURE_DECISION.md](docs/INFRASTRUCTURE_DECISION.md) for cost tripwires and the exit plan

---

## 7. Running it on your own computer

Needs Node.js 20 or newer.

```bash
cd web
npm install
cp .env.example .env.local     # then fill in the values from the table above
npm run dev
```

Open http://localhost:3000. With no Supabase values, the app runs in **demo mode** with read-only sample data.

A minimal `web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=yorvia-media
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.your-domain.com
```

(`.env.local` is ignored by git. Never commit it.)

---

## 8. What's built

| Phase | Features |
|---|---|
| 1 | Accounts, explore map with filters, pin a place, reviews with pros/cons and price paid, saves |
| 2 | Trips, matching by destination and dates, organiser-approved join requests, members-only chat |
| 3 | Public profiles, phone/email badges, buddy ratings after trips, report and block, safety tips |
| 4 | Itineraries (private, public, or shared with a trip group) and the AI trip planner |
| 5 | Dimension ratings, last-visited and condition reports, trip expense splitting, "along a route" search, share buttons, analytics |
| 6 | Photo upload to Cloudflare R2, galleries, cover photos |
| 7 | Group polls inside trips (destination, dates, stay, activities) |

Not built yet (see the backlog): AI natural-language search, review summaries, creator profiles and collections, real road routing, bookings (buses, hotels, activities), vendor and guide panels, parcel carrying, offline mode, native mobile apps.

## 9. More documents

- [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md): research, competitors, validation targets, backlog, open decisions
- [docs/PLAN.md](docs/PLAN.md): the original plan, features and revenue ideas
- [docs/INFRASTRUCTURE_DECISION.md](docs/INFRASTRUCTURE_DECISION.md): Supabase vs Cloudflare, lock-in, exit plan
- [docs/CLOUDFLARE_R2_SETUP.md](docs/CLOUDFLARE_R2_SETUP.md): photo storage setup in detail
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): deployment notes
- [docs/INTEGRATIONS_AND_PARCELS.md](docs/INTEGRATIONS_AND_PARCELS.md): connecting existing services, parcel carrying, revenue
- [landing/index.html](landing/index.html): a standalone sign-up page for testing demand
- [web/README.md](web/README.md): developer notes
