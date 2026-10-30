# YORVIA

A travel community platform. Pin beautiful places on a map, post photos and stories, read honest reviews with real prices and current conditions, find people going to the same place, plan trips together (chat, polls, expenses, itineraries), get AI help (trip planner, plain-language search, review summaries, photo recognition), and find local guides and businesses. Online booking and payments are **not** built yet.

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
9. [Backups, and getting out of Supabase](#9-backups-and-getting-out-of-supabase-if-you-ever-need-to)
10. [More documents](#10-more-documents)

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
- [ ] Open **SQL Editor -> New query**. Run these 12 files from `web/supabase/` **in this order, once each** (open the file on GitHub, copy all, paste, Run):

  | # | File | What it adds |
  |---|---|---|
  | 1 | `schema.sql` | Accounts/profiles, places (pins), reviews, saves |
  | 2 | `phase2_trips.sql` | Trips, matching, join requests, group chat |
  | 3 | `phase3_safety.sql` | Verification badges, buddy ratings, report and block |
  | 4 | `phase4_itineraries.sql` | Itineraries and the AI usage log |
  | 5 | `phase5_community.sql` | Dimension ratings, condition reports, expenses, analytics |
  | 6 | `phase6_photos.sql` | Photo records |
  | 7 | `phase7_polls.sql` | Group polls |
  | 8 | `phase8_social.sql` | Posts, likes, comments, follows, avatars, collections, badges |
  | 9 | `phase9_utilities.sql` | Place essentials, cost reality, private emergency contacts |
  | 10 | `phase10_ai_tools.sql` | Usage log for the AI search, summary and photo tools |
  | 11 | `phase11_directory_admin.sql` | Business directory, enquiries, admin powers |
  | 12 | `phase12_moderation_notifications.sql` | Account suspension, in-app notifications |

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
- [ ] Optional, for "Continue with Google": in Google Cloud Console create an OAuth client (type: Web application). Add the **callback URL shown in Supabase -> Authentication -> Providers -> Google** as an authorised redirect URI. Paste the Google client ID and secret into that Supabase Google page and enable it. Then set `NEXT_PUBLIC_GOOGLE_LOGIN=true` in Vercel and redeploy. (Don't set it before Supabase's Google provider is working, or the button will fail.)
- [ ] Make yourself an admin (see [section 4](#4-logging-in-your-first-user-and-admin)) once you have created your own account.

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

### Step 4b: Road routing (optional)

- [ ] Create a free key at https://openrouteservice.org (sign up, then "Request a token") -> becomes `ORS_API_KEY` (secret). Without it, "Along a route" still works using a straight line. With it, the route follows real roads and shows driving distance and time (logged-in users only, 30 routes per person per day by default).

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
| `AI_SEARCHES_PER_DAY` / `AI_SUMMARIES_PER_DAY` / `AI_IDENTIFY_PER_DAY` | Optional | You choose | No | Per-user daily caps for AI search, review summaries and photo recognition. Defaults `20` / `20` / `10` |
| `ORS_API_KEY` | Optional | openrouteservice.org free token | **Yes** | Turns on road routing. Server-only |
| `ROUTES_PER_DAY` | Optional | You choose | No | Road routes per person per day. Default `30` |
| `NEXT_PUBLIC_GOOGLE_LOGIN` | Optional | You set it to `true` after enabling Google in Supabase | No | Shows the "Continue with Google" button |
| `NEXT_PUBLIC_BOOKING_AID` | Optional | Your Booking.com affiliate id, if you join their programme | No | Added to "Find stays" links. When set, the page says you may earn a commission |
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

### Becoming an admin

There is an **admin panel at `/admin`** (a "🛡️ Admin" link also appears under "More" for admins). Nobody is an admin by default, and the app can never make someone an admin. You do it once in Supabase:

1. Create your account on the site and log in once.
2. Supabase -> **Authentication -> Users** -> copy your **User UID**.
3. Supabase -> **SQL Editor** -> run (with your id pasted in):
   ```sql
   insert into public.admins (user_id) values ('PASTE-YOUR-USER-UID-HERE');
   ```
4. Reload the site. You'll now see **Admin** under "More" and `/admin` will open.

What admins can do: see growth numbers (people seen, contributors, return rate), triage user **reports** (open / reviewing / actioned / dismissed), **verify or hide business listings**, **remove** other people's posts, comments and photos (a "remove (admin)" button appears next to them), and **suspend or reinstate accounts** (button at the top of a person's profile). A suspended person can still log in and read, but cannot post, comment, message, enquire, follow, upload or use AI, and they see a banner explaining why. People you report get a notification when you mark their report actioned or dismissed. Admins cannot read private data such as enquiry contact details or emergency contacts. To permanently delete an account, use Supabase -> Authentication -> Users. When you remove a photo, its file may stay in Cloudflare R2. It costs almost nothing, but you can delete it there too.

**Suggested checklist before you mark a business "Verified"** (the badge tells travellers the YORVIA team checked it, so only give it when you have): confirm the owner's identity, confirm the business is real and operating (for example a phone call or a visit), check any required licences for that kind of business (for example tourism registration for operators), and look for complaints. Remove the badge if problems appear.

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
| "Continue with Google" button missing | Set `NEXT_PUBLIC_GOOGLE_LOGIN=true` (after enabling Google in Supabase) and redeploy |
| Google login fails with a redirect error | The redirect URI in Google Cloud must exactly match the callback URL Supabase shows, and Supabase's Site URL / Redirect URLs must include your site address |
| Notifications bell never shows anything | `phase12_moderation_notifications.sql` hasn't been run. It checks for new items once a minute |
| "Your account is suspended" banner | An admin suspended the account. Lift it from that person's profile (as an admin) |
| `/admin` says "for YORVIA admins" | Your user id isn't in the `admins` table yet. See section 4 |
| AI search / summary / photo tool says it isn't set up | `ANTHROPIC_API_KEY` is missing, or `phase10_ai_tools.sql` hasn't been run |
| "Daily limit reached" on an AI tool | Per-user cap. Raise `AI_SEARCHES_PER_DAY` etc., or wait 24 hours |
| Weather box says "isn't available" | The free Open-Meteo service couldn't be reached from that browser. It retries on the next visit |
| Directory or posts pages error with "relation does not exist" | A SQL file from Step 1 hasn't been run. Run the missing one (in order) |
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
| 8 | Travel feed (posts with photos, likes, comments), follow people, avatars, collections, badges, travel passport |
| 9 | Weather forecast with alerts, fuel cost estimate, Discover / weekend explorer / budget finder / surprise me, place essentials (toilet, parking, fees...), cost reality (advertised vs paid), emergency page with private contacts and one-tap location sharing |
| 10 | AI tools: plain-language place search, review summaries, "what place is this?" from a photo |
| 11 | Business directory (homestays, guides, vehicles, activities) with enquiries, an admin panel, optional Google login |
| 12 | Account suspension by admins, in-app notifications (bell + page) for enquiries, replies, join requests and decisions, comments, followers, ratings and report updates, optional road routing |
| UI | New design, dark mode, mobile bottom bar, installable app (PWA) with an offline page, save itineraries for offline use |

### Not built, and why

| Not built | Why |
|---|---|
| **Online booking and payments** (hotels, buses, trains, flights, activities) | Needs partner or affiliate API access and approval, and a payment gateway account in your name (for example Razorpay), plus payment-compliance and GST decisions. The app links out to other sites instead, and the directory is enquiry-only |
| **TripCarry (carrying parcels between travellers)** | Real legal exposure: carriers can be held liable for what is in a parcel. Needs legal advice, ID checks, escrow payments and a prohibited-items process first. See `docs/INTEGRATIONS_AND_PARCELS.md` |
| **Native Android/iOS apps** | The website works as an installable app (PWA). Store apps are a separate project and cost (Apple $99/year, Google $25 once) |
| **Toll costs, live crowd levels, live trip tracking** | No reliable data source wired in. Showing guesses as facts would mislead people |
| **Road routing without a key** | Optional: add `ORS_API_KEY` (Step 4b). Without it a straight line is used |
| **Email / push notifications** | The in-app bell works. Email and phone push need an email sender (for example Resend) or a push service, plus server code that can look up people's email addresses |
| **Group "AI best compromise" voting, creator earnings, vendor payouts** | Later, once there are users to learn from |

## 9. Backups, and getting out of Supabase if you ever need to

Your data is plain PostgreSQL and the app's whole database setup is the 12 SQL files, so you are never locked in. Two scripts in `web/scripts/` make that real (tested on a local Postgres; not yet run against Supabase itself):

```bash
# Save a backup (get the URL from Supabase: Project Settings -> Database -> Connection string -> URI)
DATABASE_URL='postgresql://postgres:YOUR-PASSWORD@db.xxxx.supabase.co:5432/postgres' ./web/scripts/backup-db.sh
```
```bash
# Put it back after a mistake (same project: the accounts are still there)
TARGET_URL='postgresql://...' ./web/scripts/restore-db.sh backups/yorvia-20261030-120000.dump
```

- Needs the PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) on your computer.
- The restore is **all-or-nothing**: if anything goes wrong, nothing is changed. It loads data into tables that already exist (so on a new server, run the SQL files first), and it asks you to type `yes`.
- To **move to another server**, also back up the accounts (`INCLUDE_ACCOUNTS=1`) and restore with `ACCOUNTS_FILE=...`. That file holds emails and password hashes, so keep it private.
- Do a test restore into a throwaway database now and then. A backup you have never restored is only a hope.
- Full explanation of Supabase alternatives, what moving would involve, and how to keep the bill small: [docs/INFRASTRUCTURE_DECISION.md](docs/INFRASTRUCTURE_DECISION.md).

## 10. More documents

- [docs/PRODUCT_STRATEGY.md](docs/PRODUCT_STRATEGY.md): research, competitors, validation targets, backlog, open decisions
- [docs/PLAN.md](docs/PLAN.md): the original plan, features and revenue ideas
- [docs/INFRASTRUCTURE_DECISION.md](docs/INFRASTRUCTURE_DECISION.md): Supabase vs Cloudflare, lock-in, exit plan
- [docs/CLOUDFLARE_R2_SETUP.md](docs/CLOUDFLARE_R2_SETUP.md): photo storage setup in detail
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): deployment notes
- [docs/INTEGRATIONS_AND_PARCELS.md](docs/INTEGRATIONS_AND_PARCELS.md): connecting existing services, parcel carrying, revenue
- [landing/index.html](landing/index.html): a standalone sign-up page for testing demand
- [web/README.md](web/README.md): developer notes
