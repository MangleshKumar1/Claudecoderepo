"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MapLoader from "@/components/MapLoader";
import SafetyTips from "@/components/SafetyTips";
import TripChat from "@/components/TripChat";
import TripRatings from "@/components/TripRatings";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import TripExpenses from "@/components/TripExpenses";
import { fmtRange } from "@/components/TripCard";
import TripCard from "@/components/TripCard";
import {
  decideMember, deleteTrip, getTrip, leaveTrip, listMembers, listTrips, listTripItineraries, requestToJoin,
} from "@/lib/data";
import { findMatches } from "@/lib/match";
import ItineraryCard from "@/components/ItineraryCard";
import type { Itinerary, Trip, TripMember } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [others, setOthers] = useState<Trip[]>([]);
  const [plans, setPlans] = useState<Itinerary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await getTrip(id);
      setTrip(t);
      if (t) {
        setMembers(await listMembers(id));
        setOthers(await listTrips());
        setPlans(await listTripItineraries(id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => { load(); }, [load, user]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(false);
  };

  const similar = useMemo(() => (trip ? findMatches(trip, others).slice(0, 6) : []), [trip, others]);

  if (trip === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (trip === null) return <p>Trip not found. <Link href="/trips">Back to trips</Link></p>;

  const isOwner = user?.id === trip.user_id;
  const mine = members.find((m) => m.user_id === user?.id);
  const approved = members.filter((m) => m.status === "approved");
  const pending = members.filter((m) => m.status === "pending");
  const canChat = Boolean(user) && (isOwner || mine?.status === "approved");
  const full = approved.length >= trip.max_buddies;
  const ended = trip.end_date < new Date().toISOString().slice(0, 10);

  async function onJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const msg = ((new FormData(e.currentTarget).get("message") as string) || "").trim() || null;
    await run(() => requestToJoin(id, msg));
  }

  return (
    <>
      <span className="tag">{trip.style}</span>
      <h1>{trip.title}</h1>
      <p>
        <strong>{trip.origin ? `${trip.origin} → ` : ""}{trip.destination}</strong> · {fmtRange(trip)}
        {trip.budget_per_person != null && <> · ~₹{trip.budget_per_person}/person</>}
      </p>
      <p className="muted">Posted by <Link href={`/profile/${trip.user_id}`}>{trip.owner ?? "a traveller"}</Link> · {approved.length}/{trip.max_buddies} buddies joined</p>
      {trip.notes && <p>{trip.notes}</p>}
      <MapLoader height={260} center={[trip.dest_lng, trip.dest_lat]} zoom={8}
        places={[{ id: trip.id, user_id: trip.user_id, title: trip.destination, description: null, category: "offbeat",
          lat: trip.dest_lat, lng: trip.dest_lng, best_season: null, how_to_reach: null, tips: null,
          photo_url: null, created_at: trip.created_at }]} />

      <p><ShareButton title={trip.title} label="Share this trip" /></p>
      <SafetyTips />
      {!isOwner && <p><ReportButton targetUserId={trip.user_id} tripId={id} label="Report this trip's organiser" /></p>}

      <h2>Travellers</h2>
      <ul>
        <li><Link href={`/profile/${trip.user_id}`}>{trip.owner ?? "Organiser"}</Link> (organiser)</li>
        {approved.map((m) => (
          <li key={m.user_id}>
            <Link href={`/profile/${m.user_id}`}>{m.name ?? "Traveller"}</Link>
            {isOwner && <> <button className="link" disabled={busy} onClick={() => run(() => leaveTrip(id, m.user_id))}>remove</button></>}
          </li>
        ))}
      </ul>

      {isOwner && pending.length > 0 && (
        <>
          <h3>Join requests</h3>
          {pending.map((m) => (
            <div key={m.user_id} className="review">
              <strong><Link href={`/profile/${m.user_id}`}>{m.name ?? "Traveller"}</Link></strong>
              {m.message && <p>{m.message}</p>}
              <button className="primary" disabled={busy || full} onClick={() => run(() => decideMember(id, m.user_id, "approved"))}>Approve</button>{" "}
              <button className="chip" disabled={busy} onClick={() => run(() => decideMember(id, m.user_id, "rejected"))}>Decline</button>
            </div>
          ))}
          {full && <p className="muted">Trip is full — decline or remove someone to make room.</p>}
        </>
      )}

      {!isOwner && (
        <>
          {!user && <p><Link href="/login">Log in</Link> to ask to join this trip.</p>}
          {user && !mine && !full && (
            <form className="stack" onSubmit={onJoin}>
              <label>Introduce yourself (optional)<textarea name="message" placeholder="Hi! I'm travelling from… and I'd love to join." /></label>
              <button className="primary" disabled={busy}>Ask to join</button>
            </form>
          )}
          {user && !mine && full && <p className="muted">This trip is full.</p>}
          {mine?.status === "pending" && <p className="ok">Request sent. The organiser will review it.</p>}
          {mine?.status === "rejected" && <p className="muted">Your request wasn't accepted.</p>}
          {mine?.status === "approved" && (
            <p><button className="chip" disabled={busy} onClick={() => run(async () => { await leaveTrip(id, user!.id); })}>Leave trip</button></p>
          )}
        </>
      )}

      {canChat && user && (
        <>
          <h2>Group chat</h2>
          <p className="muted">Only the organiser and approved travellers can see this chat. Don't share sensitive details until you trust the group.</p>
          <TripChat tripId={id} userId={user.id} />
        </>
      )}

      {canChat && (
        <>
          <h2>Itineraries</h2>
          <p className="muted">Plan the days together. Everyone in this trip group can edit.</p>
          <div className="grid">{plans.map((p) => <ItineraryCard key={p.id} it={p} />)}</div>
          <p><Link href={`/itineraries/new?trip=${id}`} className="chip active">✨ Plan this trip</Link></p>
        </>
      )}

      {canChat && user && (
        <TripExpenses tripId={id} me={user.id} isOwner={isOwner}
          people={[{ id: trip.user_id, name: trip.owner ?? null }, ...approved.map((m) => ({ id: m.user_id, name: m.name ?? null }))]} />
      )}

      {ended && canChat && user && (
        <TripRatings tripId={id} me={user.id}
          people={[{ id: trip.user_id, name: trip.owner ?? null }, ...approved.map((m) => ({ id: m.user_id, name: m.name ?? null }))]} />
      )}

      {isOwner && (
        <p><button className="link error" disabled={busy}
          onClick={() => { if (confirm("Delete this trip and its chat?")) run(async () => { await deleteTrip(id); router.push("/trips"); }); }}>
          Delete trip</button></p>
      )}
      {error && <p className="error">{error}</p>}

      {similar.length > 0 && (
        <>
          <h2>Similar trips</h2>
          <div className="grid">
            {similar.map((s) => <TripCard key={s.trip.id} trip={s.trip} note={`${s.overlap}d overlap`} />)}
          </div>
        </>
      )}
    </>
  );
}
