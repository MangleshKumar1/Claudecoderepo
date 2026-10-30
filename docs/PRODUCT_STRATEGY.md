# YORVIA Product Strategy

This is the living strategy: positioning, competitors, the problems we are solving, how to get the first users, how to know the idea works, and the backlog. It collects the market research and ideas from our planning sessions.

> **About the figures.** Statistics and competitor details below come from desk research notes (surveys, forum threads, app-store listings) that I haven't independently re-verified. Treat them as leads to confirm before you quote them to anyone, and re-check competitors' current features before you decide positioning.

## 1. Positioning

**A community-powered travel discovery network.** Every traveller contributes to a living map: real places, real costs, honest pros and cons, current conditions. Travellers can find each other, plan together, and (much later) book.

Principles:
1. **The map is the heart of the product**, not a side screen. Social feed supports it.
2. **Useful even when you aren't booking.** A person should have a reason to open the app between trips: find a weekend place, check a road, see who's travelling.
3. **Information people can trust:** show *when* someone last visited, *how many* people reported, and *what it really cost*.
4. **Safety by design** for meeting strangers (already built, see Phase 3).
5. **Don't build booking engines.** Connect to existing providers later through affiliates/APIs; keep them modular.
6. **Don't be "another AI itinerary generator".** AI is used to make *community* data more useful (summaries, search, planning from saved pins), not to replace it.

## 2. Competition

| Product | Strong at | Gap you can use |
|---|---|---|
| Polarsteps | Trip tracking, journals, sharing | Not a shared knowledge base of places, little buddy matching |
| Tripoto | Indian travel stories, itineraries, packages | Content-led; structured live conditions and costs are limited |
| Wanderlog | Collaborative planning, maps, expenses | Planning tool; weaker community discovery |
| Couchsurfing | Meeting travellers/hosts | Not trip planning or place data |
| BlaBlaCar | Same-direction ride sharing | Transport only |
| Travello | Social travel community | General social network |
| Google Maps / Tripadvisor | Place data and reviews | Single score hides trade-offs; no travellers matching |
| **The Travellers App** (per App Store listing) | Cab sharing, trip groups, location pins with tips, nearby travellers, community Q&A | **Closest competitor to this idea. Install it and study it before you commit to positioning.** |

Where you can win: richer, structured and recent place information (dimension ratings, conditions, real costs), strong traveller matching with safety, route-based discovery, and AI that works on top of that community data.

## 3. Problems we are solving

| # | Problem (what travellers struggle with) | Our answer | Status |
|---|---|---|---|
| 1 | "Is this place actually worth it? Where exactly? Is the road ok? What's the real cost?" | Community pins with how-to-reach, tips, best season, **dimension ratings, last-visited date, condition reports** | **Built** (Phase 1, 5) |
| 2 | Hard to find people going to the same place | Trips, matching by destination + dates, organiser-approved joins, chat | **Built** (Phase 2) |
| 3 | Group trip planning chaos in WhatsApp | Trip group chat, shared itineraries, **expense splitting** | Mostly built (Phases 2, 4, 5). Missing: voting on destination/dates (backlog) |
| 4 | Info scattered across many apps | One trip workspace: people, pins, itinerary, chat, expenses | Built except bookings/tickets/photos/memories |
| 5 | Reviews that aren't genuine or current | Multi-dimension ratings, last-visited, condition reports, verified-profile badges | Built; "verified visit" proof is backlog |
| 6 | Scams, overcharging, unreliable local services | Report/block, safety tips, price paid in reviews | Partly. "Quoted vs actual price" and vendor trust layer are backlog |
| 7 | Hard to find basic facilities (clean toilets, fuel, water, parking) | `rest_stop` category, condition reports | Basic version built; structured facility fields are backlog |
| 8 | Finding great places along a journey | **"Along a route" corridor discovery** | **Built (straight-line corridor)**. Real road routing is backlog |

### Research notes behind these (verify before citing)
- A reported survey of Indian travellers found strong interest in a "travel super-app", with most citing juggling multiple apps and the lack of connected bookings as pain points.
- A research tracker estimated that planning a group trip can take on the order of 19 hours over 11 days and dozens of messages (reported estimate, not a universal figure).
- An Indian hygiene study reported that roughly a quarter of surveyed international travellers had difficulty finding a public toilet when needed.
- Travel-advisory sources describe scams involving taxis, guides, tickets and accommodation in India.
- Forum threads (r/solotravel, r/TravelInIndia, r/SoloTravel_India, r/travelplanning) repeatedly show people struggling to find companions, with Facebook groups described as spammy or inactive, and group-trip date/budget agreement as the hardest first step.
- Complaints are not proof people will switch apps. That's what the validation plan below is for.

## 4. Cold start: how to get the first users

The cold-start problem: users won't join an empty map, and people won't post without users. So:

1. **Launch one community, not the world.** Start with the **Delhi NCR** weekend-travel audience and a few corridors (e.g. Delhi to Rishikesh, Mussoorie, Manali, Jaipur, Agra). Concentrated audience, clear weekend use case, easy to meet people.
2. **Gather content before users.** Don't open the doors to an empty map. Suggested pre-launch targets (suggestions, not proven requirements):

   | Content | Target |
   |---|---|
   | Verified destination pins | 300 |
   | Useful reviews | 500 |
   | Travel photos | 1,000 |
   | Local guides / creators | 20 |
   | Local business listings | 30 |
   | Upcoming community trips | 10 |
3. **Build the audience outside the app first:** Instagram page, WhatsApp community, Telegram channel, Google Forms to collect discoveries. Weekly content rhythm: Mon hidden places, Tue budget trips ("Rishikesh for ₹2,000?"), Wed find travel partners, Thu community discovery, Fri weekend plans.
4. **Make creators contributors, not competitors.** Give a creator a profile page with their own travel map, itineraries and collections; they link it from Instagram. Loop: creator shares map, followers open it, some save places and sign up, they contribute, which attracts more users. Offer verified-contributor badges, expert badges, visibility and (later) earnings.
5. **Reasons to contribute:** recognition, badges, followers, featured status, future monetisation.

## 5. How to know the idea works (validation)

**Don't count Instagram followers as validation. Count actual use of the core features.**

### 30-day plan
| Days | Do |
|---|---|
| 1-5 | Interview 30-50 regular travellers: where they discover places, how they plan, how they find companions, what they dislike, would they contribute |
| 6-10 | Landing page (`landing/index.html`) and the clickable app |
| 11-17 | Founding community: 100 interested members, 50-100 real destination submissions |
| 18-24 | Watch real behaviour: do people submit, save, share, join trips, invite friends? |
| 25-30 | Decide using the table below |

### Targets (experimental, not universal benchmarks)
| Metric | Target |
|---|---|
| Interested users | 100+ |
| People who contribute content | 30+ |
| Real destination submissions | 100+ |
| People who save a discovery | 40+ |
| Users who return within 7 days | 25%+ |
| People who invite someone | 15+ |

### Measuring it (built in Phase 5)
The app records anonymous-friendly events in its own database (no third-party tracker) and ships a view that computes these numbers. In the Supabase **SQL editor**:

```sql
select * from metrics_validation;        -- the targets above, in one row
select * from metrics_daily_active;      -- daily active people
```

`metrics_validation` columns: `people_seen`, `contributors`, `places_submitted`, `people_who_saved`, `people_who_shared`, `join_requests`, `ai_plans`, `cohort_size`, `returned_within_7d_pct`. (The 7-day return rate only counts people first seen at least 8 days ago.)

Only you can read them. The app can write events but never read them, and the metrics views are locked from the API. Privacy: events hold a random per-browser ID (or the logged-in user ID), the page path, an event name and small non-personal properties. The app skips tracking when the browser sends Do Not Track / Global Privacy Control. Mention analytics in your privacy policy.

### Run a proper experiment (60 days, as in the research)
Week 1 research (100+ real complaints, 20-30 interviews). Week 2 try competitors hands-on (including The Travellers App). Week 3 prototype. Week 4 recruit 30 contributors. Weeks 5-6 launch map pins, posts, reviews, collections. Weeks 7-8 test matching and trip rooms with a small group and measure repeat usage.

Interview panel (50 travellers): 10 solo, 10 friend groups, 10 bike/road-trip, 10 families, 10 frequent content sharers. **Ask them to show how they planned their last trip**, rather than whether they like your idea. Ask which apps they actually opened, what information was hard to find, what they'd wish someone had shared, whether they'd contribute, what would bring them back.

Show three clickable prototypes (community map, find travellers, group trip planning) and **measure which they use, not which they say they like**.

## 6. Feature backlog

Priority order from the research (my judgement, not measured demand). **Bold = shipped.**

| Priority | Feature | Why | Effort |
|---|---|---|---|
| 1 | **Community destination map** | Core identity | done |
| 2 | **Travel-buddy matching** | Key differentiator | done |
| 3 | **Group trip tools: chat, itinerary, expenses** | Real pain point | done (voting missing) |
| 4 | **Verified-ish reviews & costs** (dimensions, last visited, conditions) | Trust | done; photo-verified visits missing |
| 5 | **Discover along a route** | Fits the map | done (straight line) |
| 6 | **AI planner** (itinerary from request + community pins) | Differentiator when fed community data | done |
| 7 | **Photo upload (Cloudflare R2)** | Content is what draws people | done for place photos; video, avatars and itinerary/review photos are next |
| 8 | **Group polls: vote on destination/dates/hotels** | Solves the first hurdle of group planning | done (AI "best compromise" suggestion is a later idea) |
| 9 | **AI natural-language search** ("peaceful places within 100 km of Delhi under ₹2,000") | Needs enough community data first | done (quality improves as pins grow) |
| 10 | **AI review summaries** ("what 200 travellers say") | Needs volume | done (needs 3+ reviews per place) |
| 11 | Real road routing for route discovery (Mapbox/OpenRouteService + PostGIS) | Accuracy | open: needs a routing provider key |
| 12 | **Travel essentials fields** (toilet yes/no, cleanliness, paid, water, parking, wheelchair) | Long-trip pain point | done |
| 13 | **"Cost reality"**: advertised vs actual (hotel price, parking, extras) | Strong trust feature | done |
| 14 | **Creator profiles, collections** ("20 best waterfalls in India"), follow | Growth loop | done (profiles, follow, collections; creator earnings later) |
| 15 | **Contribution reputation and badges**, travel passport | Motivates contributing | done (computed badges, points, passport) |
| 16 | Trip journal / memories map / trip replay | Retention | open (the feed and travel passport cover part of this) |
| 17 | **Budget-based destination finder** ("what can I visit for ₹5,000?"), Surprise trip, Weekend explorer | Needs cost data from users first | done (budget search only covers places with a shared daily cost) |
| 18 | **Fuel calculator** (done), toll calculator (not built: needs a data source) | Road-trip utility | fuel done, toll open |
| 19 | **Weather alerts** (done, Open-Meteo), crowd indicators (not built: no credible data) | Don't present guesses as fact | weather done, crowd open |
| 20 | **Google login** (optional, needs Supabase + Google setup), phone verification (needs SMS provider), **emergency contacts + SOS page** (done); live trip share not built | Safety and convenience | mostly done |
| 21 | **PWA / offline mode** (maps, itinerary, contacts) | Poor-network areas | done: installable app, offline page, save itineraries offline (offline maps not built) |
| 22 | **Photo place recognition**, camera tourist guide | Cool, but late | done (guesses only, never identifies people) |
| 23 | **Vendor panel, local guide panel, admin panel** | Needed before bookings | done: directory with enquiries + admin panel (no payouts yet) |
| 24 | Bookings via affiliates/APIs: buses, hotels, activities, insurance | Revenue | open: outbound links only so far; needs partner approval |
| 25 | Local experience marketplace | Revenue | enquiry-only version done via the directory; no bookings/payments |
| 26 | TripCarry parcel pilot | See `docs/INTEGRATIONS_AND_PARCELS.md`; needs legal advice first | large |

Items not to build early: your own flight/train/hotel inventory, another generic hotel-booking site.

## 7. Business model (reminder)
Don't depend on ads. Order of introduction: affiliate bookings, premium (offline maps, advanced AI, private collections), creator marketplace (paid guides/itineraries), sponsored pins and business subscriptions, group-trip commission, and listings for small local operators who have no website (a local trekking operator in Himachal could receive bookings through the platform). Details in `docs/PLAN.md` and `docs/INTEGRATIONS_AND_PARCELS.md`. Don't charge people to post, review or discover until the community has grown.

## 8. Budget stages (planning estimates for a mostly self-built project, excluding your time)
| Stage | What | Rough cost |
|---|---|---|
| 1 Validation | Landing page, community, interviews, hand-curated places | ₹0-5k |
| 2 MVP | Accounts, pins, posts, ratings, saved places (what's built) | ₹15-40k |
| 3 Growth | Better discovery, groups, matching, moderation, messaging, AI experiments | ₹30-80k |
| 4 Monetisation | Partner dashboard, booking integrations, payments, commissions | ₹1-3L |

Hiring out the same scope costs far more (indicatively ₹4-8 lakh for a social-travel MVP). Free tiers aren't guaranteed to stay free; see `docs/INFRASTRUCTURE_DECISION.md`.

## 9. Decisions only you can make (open)

My recommended default is in bold. Change them and I'll update the plan.

| Question | Options | Recommended default |
|---|---|---|
| Identity of the platform | Social network / global discovery map / complete travel ecosystem | **Complete ecosystem, entered through the discovery map** |
| Role of the map | Central / one feature / equal with feed | **Central, with a feed as support** |
| Traveller connections | Same-destination / public group trips / both with activity matching and cost sharing | **Both (already built: matching + trips)** |
| First launch | Website/PWA / Android+iOS / both | **PWA first** (what exists), apps later |
| How to build | You with AI / hire 1-2 developers / outsource | **You with AI assistance**, hire when validated |
| Market | India first / international / both | **India first (Delhi NCR)** |
| Product direction | All-in-one super app / AI-first / booking marketplace | **Community + AI first, bookings later** |

## 10. Stack note
Earlier suggestions listed Spring Boot, Firebase Auth, Gemini and AWS. What's built uses Next.js, Supabase (Postgres) and the Claude API, because that was the fastest path to a tested, deployable MVP. All of it is plain Postgres underneath, and a Spring Boot backend remains possible later. See `docs/INFRASTRUCTURE_DECISION.md`.
