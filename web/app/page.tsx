"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import PlaceCard from "@/components/PlaceCard";
import { CardSkeletons } from "@/components/Skeletons";
import TripCard from "@/components/TripCard";
import { CATEGORY_META } from "@/lib/categories";
import { listPlaces, listTrips } from "@/lib/data";
import type { Category, Place, Trip } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    listPlaces().then(setPlaces).catch((e) => setError(e.message));
    listTrips().then(setTrips).catch(() => setTrips([]));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Find beautiful places. Travel with people who get it.</h1>
        <p>Pin hidden gems, read honest reviews with real prices and current conditions, and plan trips with a group, with an AI planner when you want one.</p>
        <form className="searchbar" onSubmit={(e) => { e.preventDefault(); router.push(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places, e.g. waterfall, Manali, cafe…" aria-label="Search places" />
          <button className="btn lg">Search</button>
        </form>
        <div className="hero-actions">
          <Link href="/trips" className="btn ghost">Find travel buddies</Link>
          <Link href="/itineraries/new" className="btn ghost">✨ Plan a trip with AI</Link>
        </div>
      </section>

      <section>
        <h2>Browse by type</h2>
        <div className="cats">
          {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
            <Link key={c} href={`/explore?cat=${c}`} className="cat"><span className="e">{CATEGORY_META[c].emoji}</span>{CATEGORY_META[c].label}</Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Latest pins</h2><Link href="/explore">See all →</Link></div>
        {error && <p className="error">{error}</p>}
        {!places && !error && <CardSkeletons n={3} />}
        {places && places.length === 0 && (
          <EmptyState emoji="📍" title="No pins yet" text="Be the first to pin a place others would love." href="/places/new" action="Pin a place" />
        )}
        <div className="grid">{places?.slice(0, 6).map((p) => <PlaceCard key={p.id} place={p} />)}</div>
      </section>

      <section>
        <div className="section-head"><h2>Upcoming trips</h2><Link href="/trips">See all →</Link></div>
        {!trips && <CardSkeletons n={3} />}
        {trips && trips.length === 0 && (
          <EmptyState emoji="🧳" title="No trips posted yet" text="Post where you're going and find people heading the same way." href="/trips/new" action="Post a trip" />
        )}
        <div className="grid">{trips?.slice(0, 3).map((t) => <TripCard key={t.id} trip={t} />)}</div>
      </section>

      <section>
        <h2>How it works</h2>
        <div className="steps">
          <div className="step"><span className="n">1</span><h3>Discover</h3><p className="muted">Browse a map of real places from real travellers, with costs, pros and cons, and recent conditions.</p></div>
          <div className="step"><span className="n">2</span><h3>Connect</h3><p className="muted">Post a trip and see who else is going. Join groups, chat, vote on plans and split expenses.</p></div>
          <div className="step"><span className="n">3</span><h3>Plan &amp; go</h3><p className="muted">Build day-by-day itineraries, or let AI draft one from your budget and interests.</p></div>
        </div>
      </section>
    </>
  );
}
