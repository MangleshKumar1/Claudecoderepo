# YORVIA – Product Plan

> **Where things stand (see these docs first):**
> - Strategy, research, competitors, validation targets and the full backlog: [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md)
> - Supabase vs Cloudflare and lock-in: [INFRASTRUCTURE_DECISION.md](INFRASTRUCTURE_DECISION.md)
> - Deploying: [DEPLOYMENT.md](DEPLOYMENT.md)
> - Parcel carrying, integrations and revenue: [INTEGRATIONS_AND_PARCELS.md](INTEGRATIONS_AND_PARCELS.md)
>
> **Built so far (in `web/`):** Phase 1 map, pins, reviews, saves. Phase 2 trips, matching, chat. Phase 3 safety. Phase 4 itineraries and AI planner. Phase 5 dimension ratings, condition reports, trip expenses, route discovery, analytics. Phase 12: suspension, notifications, road routing. Phases 8-11: social feed, utilities (weather, fuel, discover, SOS), AI tools, business directory + admin panel. Phase 7 group polls. Phase 6 photo upload to Cloudflare R2 (see [CLOUDFLARE_R2_SETUP.md](CLOUDFLARE_R2_SETUP.md)).

> Costs and competitor details are estimates from general knowledge. Verify current pricing and features before deciding.

## 1. Vision
One place where travellers **discover** (pinned hidden gems), **connect** (people going to the same place), **plan** (AI itineraries) and later **book** (bus, hotel, vehicle, activities) with honest community ratings.

## 2. Feature ideas

### Core social / discovery (MVP)
- Profiles with travel history and a "places visited" map
- Post photos/short videos/reels tied to a map pin
- **Pin a place**: location, photos, best season, how to reach, tips, safety notes
- Map explorer with filters (beach, trek, food, offbeat, budget, solo-safe, family-friendly)
- Save places to boards ("Goa 2027", "Himalayas bucket list")
- Follow people, like/comment, share links to a trip or pin
- Reviews with **pros/cons + fare/cost rating** (see section 5)

### Connect people (the differentiator)
- "I'm going to X from date A to B" – find others on the same trip
- Match by dates, budget, interests, language, solo/group, gender preference
- Group chat per trip, shared expense splitter, shared checklist
- Verified profiles (phone + ID optional), ratings for travel buddies, report/block, share live location with trusted contacts (safety is critical)
- Local guides / hosts: locals can offer tips, meetups, or paid tours

### Planning
- Collaborative itinerary builder (drag-and-drop days, map route view)
- Budget tracker and expense split
- Packing lists, document vault, offline mode
- Weather, best-time-to-visit, crowd levels
- Import bookings from email/screenshots

### AI features
- AI trip planner: "5 days, Kerala, ₹25k, love food + nature" -> full itinerary with pins you can edit
- Chat assistant: "Is it safe for solo women in March?" answered with community data + sources
- Photo -> "where is this?" place identification from user photos
- Auto-generated trip recap/story video from photos
- Smart buddy matching and review summaries ("what 200 travellers say in 3 lines")
- Price-drop and "best time to book" predictions (needs booking data, later)
- Real-time translation / phrase cards (use existing APIs)
- Review spam/fake detection and content moderation

### Modern extras
- Trip "reels" feed and short-form travel video
- Sustainability tags (eco stays, low-crowd alternatives to overtouristed places)
- Gamification: badges, countries/states collected, local-expert levels
- Live "right now" reports: road closed, crowd, weather, snow
- AR/360 previews (later), offline maps, voice search

## 3. Monetisation (later)
1. **Affiliate commissions** – hotels, buses, flights, activities via partner APIs (lowest effort, start here)
2. **Booking marketplace** – own commission once volume exists
3. **Local guide/host marketplace** – take 10-20% per booking
4. **Premium subscription** – AI planner unlimited, offline, ad-free (~₹99-199/month)
5. **Sponsored pins/ads** for hotels, resorts, tourism boards (only after you have audience)
6. **Group-trip packages** curated with operators
7. B2B data/insights for tourism boards (long term)

Rule: don't add booking until people already use the community.

## 4. Does a platform already connect all this?
Partial overlaps exist, but nobody owns the full combination well:

| Product | What it does | Gap |
|---|---|---|
| Wanderlog, TripIt, Tripadvisor trips | Planning/itineraries | Weak social/buddy matching |
| Polarsteps, Instagram, Pinterest | Share/discover | No planning/booking |
| Tripadvisor, Google Maps | Reviews/places | Review trust issues, no traveller matching |
| Rome2rio, Omio | Multimodal transport search | No community |
| Booking, MakeMyTrip, redBus, Goibibo, ixigo | Booking | Transactional, no community |
| Couchsurfing, Meetup, Backpacker groups on WhatsApp/Facebook | Meet travellers | Unstructured, unsafe, no tools |
| Zostel/hostel apps | Stays + social | Limited to their properties |
| BlaBlaCar | Ride sharing | Not trips |

**Opportunity**: community + buddy matching + honest cost/fare reviews + AI planning in one app, starting in one niche. The hard part is not features but **getting users**, since these are big incumbents.

## 5. Ratings, pros/cons and fare transparency
- Every pin/service gets: overall rating, **pros, cons, "what I paid"** (with date), crowd level, safety, value-for-money
- Verified-visit badge (photo with geotag/timestamp) to reduce fake reviews
- Show price ranges from real traveller reports ("Auto from station: ₹80-120")
- Scam alerts ("tourist traps") per place

## 6. Costs (rough estimates, India-based solo/small team)

| Stage | What | Estimate |
|---|---|---|
| Validation (weeks 1-4) | Landing page, domain, ads/community outreach | ₹5k-30k |
| MVP, DIY or with AI help (months 1-3) | Cross-platform app (React Native/Flutter) + Supabase/Firebase, Mapbox/Google Maps free tiers, domain, store fees (Play $25 one-time, Apple $99/yr) | ₹30k-1.5L (if you code it yourself, mostly your time) |
| MVP via freelancers/agency | Same scope | ₹4L-15L |
| Running costs early | Hosting, DB, maps, image storage, AI API | ₹3k-25k/month, grows with users |
| Marketing | Content, creators, ads | ₹20k-1L/month if you pay for it |
| Booking integrations | Partner API access/affiliate programs | Often free to join, but approval needs traffic |

Maps, image storage and AI calls are the main variable costs. Use free tiers and cache aggressively.

## 7. How to avoid building something nobody wants

### Step 1: Pick ONE narrow niche (not "all travellers")
Examples: solo travellers in India, college students on budget trips, Himalayan trek groups, weekend road trips from one city. A focused community beats a generic app.

### Step 2: Validate before coding (2-4 weeks, nearly free)
1. Talk to 20-30 real travellers. Ask: "How did you plan your last trip? What annoyed you? How did you find people to go with?"
2. Put up the landing page in `landing/` and share it. Target: **300+ waitlist emails or 100+ people clicking "I want this"**
3. Start a **WhatsApp/Telegram/Discord group or Instagram page** for the niche and post beautiful hidden places and trip-buddy requests manually. If people join and talk, that's your signal.
4. Run the "concierge MVP": match 10 pairs of travellers manually via a Google Form. If they thank you and travel together, build the app.

**Go/no-go signals**: people reply unprompted, ask "when is the app?", return weekly, invite friends.
**No-go**: only friends say "nice idea", and sign-ups stay near zero after a real push.

### Step 3: Build the smallest MVP (6-10 weeks)
Pins + map + posts + profiles + "who's going to X" + chat + reviews. **Skip booking, AI and payments** at first.

### Step 4: Get the first 1,000 users
- Seed content yourself: 200-500 great pins in 1-2 destinations so the app isn't empty
- Instagram/YouTube Shorts travel content pointing to the app
- Partner with micro-influencers, trek groups, college travel clubs, hostels
- Reddit, Facebook travel groups, local communities (share value, not spam)
- Referral loop: "invite a buddy to your trip"
- Focus on one city/route first so matching actually works (marketplaces need density)

### Step 5: Add AI, then booking affiliates, then premium
Add features only when usage data shows demand.

## 8. Suggested tech stack (MVP)
- App: Flutter or React Native (Android first for India; iOS later) or a PWA for fastest start
- Backend: Supabase (Postgres + auth + storage + realtime chat) or Firebase
- Maps: Mapbox or OpenStreetMap/MapLibre (cheaper than Google Maps)
- AI: Claude API for planner/assistant, with caching
- Moderation: reports, block, basic automated checks from day one

## 9. Risks
- Cold start (empty app) -> seed content + narrow niche
- Safety/trust of meeting strangers -> verification, reports, safety features
- Fake reviews -> verified visits
- Heavy competition -> win on community and niche, not breadth
- Legal: privacy (India DPDP Act), user content moderation, booking/payments compliance later

## 10. Roadmap
- **Weeks 1-4**: niche pick, interviews, landing page, community group, concierge matching
- **Months 2-3**: MVP (pins, posts, buddies, chat, reviews)
- **Months 4-6**: grow to 1k-5k users in one region, add AI planner and itinerary builder
- **Months 6-12**: affiliate bookings, premium, guides marketplace, expand regions
