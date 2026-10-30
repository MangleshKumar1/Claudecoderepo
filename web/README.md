# TripMates Web (Phases 1-2)

Next.js (App Router, TypeScript) + Supabase + MapLibre.

**Phase 1 features:** accounts, map explorer with category filters, pin a place (click the map), place pages, reviews with pros/cons, price paid, value and safety ratings, save places.

**Phase 2 features:** post a trip (destination on the map, dates, budget, style, group size), see trips that match yours (destination within 75 km and overlapping dates, ranked by shared days, distance and style), ask to join, organiser approves or declines, and a members-only group chat with realtime updates.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys the app runs in **demo mode** with read-only sample data.

## Enable accounts, pins and reviews

1. Create a free project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/phase2_trips.sql` (already have Phase 1 set up? Just run `phase2_trips.sql`; it also fixes the review author link)
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings -> API)
4. In Authentication -> Providers, keep Email enabled (disable "Confirm email" while testing if you like)
5. Restart `npm run dev`

Row-level security is on: anyone can read, only the owner can change their own places, reviews and saves.

## Notes

- The map uses MapLibre's demo tiles (`components/Map.tsx`). Switch to MapTiler, Stadia or Mapbox before launch.
- Photo upload is a URL field for now. Supabase Storage upload is next.
- Safety by design: chat is visible only to the organiser and approved travellers, the organiser approves every join request, and group size is enforced in the database.
- Chat uses Supabase Realtime (enabled by `phase2_trips.sql`) and also polls every 20 seconds as a fallback.
- Next up: traveller profiles and verification, ratings for travel buddies, report/block, itineraries.
