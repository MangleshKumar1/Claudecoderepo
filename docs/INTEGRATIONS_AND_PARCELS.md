# Integrations, Parcel Carrying ("TripCarry") and Merged Vision

> Pricing/availability of third-party services changes. Verify before committing.

## 1. Build vs. plug in existing services

Principle: **don't rebuild what exists.** Build the community, matching, trust and ratings layer; plug in the rest through APIs/SDKs.

Note: MCP/"connectors" are for AI assistants (e.g. letting Claude call tools). Your *app* will use normal **APIs and SDKs**. MCP can still be useful inside the AI planner (the planner calls maps/weather/booking tools).

| Need | Plug in (examples) | Notes |
|---|---|---|
| Maps, pins, routes | Mapbox, Google Maps Platform, or OpenStreetMap + MapLibre | OSM/MapLibre is cheapest |
| Place data (hotels, restaurants, POIs) | Google Places, Foursquare, OpenStreetMap/Overpass | Check caching/licensing rules |
| Directions & ETA | Google Directions, Mapbox Directions, OpenRouteService | Needed for route-matching of parcels and trips |
| Login & phone verification | Firebase/Supabase Auth, Twilio/MSG91 OTP | Phone OTP is table stakes in India |
| ID/KYC verification | DigiLocker, Digio, Onfido/Persona-style providers | Required for parcel carriers |
| Payments & escrow | Razorpay, Cashfree, Stripe (Razorpay Route / marketplace split payouts) | Escrow is key for parcel trust |
| Hotels | Booking.com / Agoda / Expedia affiliate APIs, Hotellook, MakeMyTrip affiliates | Affiliate first; approval usually needs traffic |
| Buses | redBus / abhibus / Busbud-style APIs or affiliate links | Often partner-only |
| Cabs/vehicles | Rental/cab partner APIs, affiliate links | |
| Flights/trains | Skyscanner/Kiwi/Amadeus affiliate, IRCTC partners | |
| Activities/tours | Viator/GetYourGuide/Klook affiliates | |
| Insurance | Partner affiliate (e.g. Acko/Digit/InsureMyTrip-style) | Regulated; refer only |
| Weather | Open-Meteo, OpenWeather | Open-Meteo is free |
| Chat & realtime | Supabase Realtime, Stream, Firebase | |
| Media storage/CDN | Cloudflare R2/Images, Cloudinary | |
| Push notifications | FCM, OneSignal | |
| Translation | Google Translate / DeepL API | |
| AI | Claude API (planner, assistant, summaries, moderation) | |
| Live tracking | Device GPS + Mapbox/Google, share-link tracking | |

## 2. TripCarry: peer-to-peer parcel carrying

### Concept
Like BlaBlaCar, but for items. A traveller posts a trip ("Delhi -> Manali, Fri 8pm"). A sender posts a parcel ("small package, Delhi -> Manali"). They match, the sender pays into escrow, the carrier delivers, and money is released on confirmed delivery. Carriers earn extra on a trip they were already taking.

### Flows
1. **Carry-along**: sender browses trips on the route, requests a carrier, agrees on price.
2. **Sender travels**: if no carrier is found, the sender sees that others on the route can carry it, or does the trip themselves.
3. **Relay / multi-hop** (your "divided work" idea): a parcel goes A -> B with carrier 1, then B -> C with carrier 2. The app splits the route into legs, matches a carrier per leg, and tracks hand-offs with QR codes.
4. **Chained errands at a destination**: at the destination, a traveller can pick up other nearby parcels/errands going to places along their onward route (an "errand board" per location).

### Core features
- Parcel listing: size, weight, photos, pickup/drop, deadline, offered price, declared value
- Carrier trip listing: route, date, spare capacity, price expectation
- **Route-corridor matching** (not just same destination: any pickup/drop near the carrier's route, using Directions API + detour distance)
- Price suggestion by distance/size
- Escrow payments, released on delivery confirmation
- **QR/OTP handoff** at pickup and delivery, with photo proof
- Live tracking link for sender and receiver
- Ratings for both sides, verified badge, carry history
- In-app chat, dispute flow, insurance option
- Prohibited-items list and mandatory declaration; sealed-package inspection prompt

### Biggest risks (design these first)
| Risk | Mitigation |
|---|---|
| **Illegal/dangerous items** (drugs, weapons, explosives, cash, contraband) - carrier can be held liable | Strict prohibited list, mandatory declaration, carrier may open/inspect with sender present or refuse, ban repeat offenders. This is the main legal exposure. |
| Theft / non-delivery | KYC for carriers, escrow, declared-value cap, ratings, insurance |
| Damage / disputes | Photo proof at pickup and drop, dispute resolution, claim caps |
| Safety meeting strangers | Public handoff points, verified profiles, share live location |
| Legal/regulatory | Possible courier/logistics rules, GST, intermediary liability (IT Act), customs for cross-border (don't allow cross-border initially). **Get legal advice before launch.** |
| Cold start | Launch one corridor (e.g. Delhi-Manali, Bengaluru-Goa) and limit to small, low-value items first (documents, small gifts) |

Recommended MVP limits: domestic only, small items under ~2 kg, declared value cap, no electronics/cash/medicines.

## 3. Revenue streams

| Revenue source | How you earn | Start when |
|---|---|---|
| Hotel bookings | Affiliate/booking commission | After first traffic |
| Bus/cab bookings | Commission per booking | After first traffic |
| Activity bookings | Commission from local operators | After first traffic |
| Travel packages | Margin on packages | With operator partners |
| Premium membership | Monthly/yearly subscription | After engaged users |
| Local guides | Commission on bookings | Guide marketplace phase |
| Sponsored destinations | Paid destination promotion | When audience is big |
| Travel insurance | Referral/affiliate | Easy add-on |
| Business listings | Paid listings for hotels/operators | After audience |
| AI Premium | Paid advanced trip generation | With AI usage data |
| **TripCarry fees** | 10-15% platform fee on carry payments + optional insurance upsell | When corridor liquidity exists |

## 4. The merged vision

| Inspired by | Feature in app |
|---|---|
| Instagram | Travel photo/reel/story feed, follow, like, comment |
| Google Maps | Pin hidden places, saved lists, routes, nearby |
| Tripadvisor | Reviews of places/stays/food/activities with pros, cons, fare ratings |
| Wanderlog | Shareable, collaborative itineraries |
| BlaBlaCar | Same-destination matching + parcel carrying |
| Booking.com | Hotels/stays/transport bookings (affiliate first) |
| AI | Discovery, buddy matching, itinerary generation, assistant, moderation |

### Additional feature ideas
- Trip groups with shared expenses and live location
- Local meetups and "who's here now" at a destination
- Offline maps and itineraries
- Emergency/SOS button with live location to contacts
- Currency converter, phrasebook, document vault
- Trip diary auto-built from photos
- Challenges/badges ("visited 10 states"), leaderboards for top contributors
- Creator tools: monetise itineraries and guides (sell premium itineraries)
- Eco/low-crowd alternatives
- Group-trip organiser tools (collect payments, RSVPs)
- Seasonal alerts (snow, festivals, road closures)
- Local business "deals for travellers" tab

## 5. Suggested build phases (so scope stays sane)

| Phase | Scope |
|---|---|
| 0 | Validate (landing page, communities, interviews) |
| 1 | Pins + map + profiles + posts + reviews with fare ratings |
| 2 | "Who's going to X" matching + trip chat |
| 3 | Itinerary builder + AI planner |
| 4 | **TripCarry pilot on 1-2 corridors** (small items, escrow, QR handoff) |
| 5 | Affiliate bookings (hotels, bus, activities, insurance) |
| 6 | Premium, guides marketplace, business listings, sponsored placements |

Phases 4 and 5 are the revenue engine, but only worth building on top of a living community.

## 6. Architecture sketch

```
Mobile app (Flutter/React Native)  <->  Backend API (Supabase/Postgres + edge functions)
   |                                       |- Auth/KYC providers
   |                                       |- Payments/escrow (Razorpay etc.)
   |                                       |- Matching service (route corridor + dates)
   |                                       |- Maps/Places/Directions APIs
   |                                       |- Booking affiliate APIs
   |                                       |- AI service (Claude API) + moderation
   +- Push, realtime chat, live tracking
```

Data core: Users, Places(pins), Posts, Reviews, Trips, Itineraries, Parcels, CarryOffers, Escrow/Payments, Handoffs, Ratings, Reports.
