"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReportButton from "@/components/ReportButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getProfile, getProfileStats, listBlocked, listRatingsFor, setBlocked } from "@/lib/data";
import type { Profile, ProfileStats, UserRating } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [blocked, setBlockedState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await getProfile(id));
      setStats(await getProfileStats(id));
      setRatings(await listRatingsFor(id));
      if (user) setBlockedState((await listBlocked()).some((b) => b.id === id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id, user]);
  useEffect(() => { load(); }, [load]);

  async function toggleBlock() {
    const next = !blocked;
    if (next && !confirm("Block this traveller? You won't see their chat messages and they can't request to join your trips.")) return;
    try { await setBlocked(id, next); setBlockedState(next); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  if (profile === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (profile === null) return <p>Profile not found. <Link href="/trips">Back to trips</Link></p>;

  const isMe = user?.id === id;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <h1>{profile.display_name ?? "Traveller"} {profile.username && <small className="muted">@{profile.username}</small>}</h1>
      <p><VerifiedBadge profile={profile} /></p>
      <p className="muted">
        {profile.home_city ? `${profile.home_city} · ` : ""}Member since {joined}
        {profile.languages.length > 0 && ` · Speaks ${profile.languages.join(", ")}`}
      </p>
      {profile.bio && <p>{profile.bio}</p>}

      <div className="grid stats">
        <div className="card"><h3>{stats?.rating_avg ? `★ ${stats.rating_avg}` : "–"}</h3><small>{stats?.rating_count ?? 0} rating(s)</small></div>
        <div className="card"><h3>{stats?.trips_joined ?? 0}</h3><small>trips completed with others</small></div>
        <div className="card"><h3>{stats?.trips_hosted ?? 0}</h3><small>trips organised</small></div>
      </div>

      {isMe ? (
        <p><Link href="/profile/edit" className="chip">Edit profile &amp; verification</Link></p>
      ) : user ? (
        <p>
          <button className="chip" onClick={toggleBlock}>{blocked ? "Unblock" : "Block"}</button>{" "}
          <ReportButton targetUserId={id} label="Report this traveller" />
        </p>
      ) : null}
      {error && <p className="error">{error}</p>}

      <h2>Ratings from other travellers</h2>
      {ratings.length === 0 && <p className="muted">No ratings yet.</p>}
      {ratings.map((r) => (
        <div key={r.id} className="review">
          <strong>★ {r.rating}</strong> <span className="muted">from {r.rater_name ?? "a traveller"}{r.would_travel_again ? " · would travel again" : ""}</span>
          {r.comment && <p>{r.comment}</p>}
        </div>
      ))}
    </>
  );
}
