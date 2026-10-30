# TripMates Web (Phase 1)

Next.js (App Router, TypeScript) + Supabase + MapLibre.

**Phase 1 features:** accounts, map explorer with category filters, pin a place (click the map), place pages, reviews with pros/cons, price paid, value and safety ratings, save places.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys the app runs in **demo mode** with read-only sample data.

## Enable accounts, pins and reviews

1. Create a free project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql`
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings -> API)
4. In Authentication -> Providers, keep Email enabled (disable "Confirm email" while testing if you like)
5. Restart `npm run dev`

Row-level security is on: anyone can read, only the owner can change their own places, reviews and saves.

## Notes

- The map uses MapLibre's demo tiles (`components/Map.tsx`). Switch to MapTiler, Stadia or Mapbox before launch.
- Photo upload is a URL field for now. Supabase Storage upload is next.
- Next up: trip buddies ("who's going to X"), chat, itineraries.
