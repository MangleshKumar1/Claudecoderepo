"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { computeBadges, levelName, reputation } from "@/lib/badges";
import { catEmoji } from "@/lib/categories";
import {
  adminIsSuspended, adminSuspend, adminUnsuspend, getActivity, getProfile, getProfileStats, isFollowing, listBlocked, listCollections, listPosts, listRatingsFor,
  listVisitedPlaces, setBlocked, setFollowing,
} from "@/lib/data";
import type { Activity, Collection, Post, Profile, ProfileStats, UserRating } from "@/lib/types";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useUser } from "@/lib/useUser";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const isAdmin = useIsAdmin();
  const [suspended, setSuspended] = useState(false);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [visited, setVisited] = useState<{ id: string; title: string; category: string }[]>([]);
  const [blocked, setBlockedState] = useState(false);
  const [following, setFollowingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await getProfile(id));
      setStats(await getProfileStats(id));
      setActivity(await getActivity(id));
      setRatings(await listRatingsFor(id));
      setPosts(await listPosts({ userIds: [id] }));
      setCollections(await listCollections({ userId: id }));
      setVisited(await listVisitedPlaces(id));
      if (user) {
        setBlockedState((await listBlocked()).some((b) => b.id === id));
        setFollowingState(await isFollowing(id));
        if (isAdmin) setSuspended(await adminIsSuspended(id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id, user, isAdmin]);
  useEffect(() => { load(); }, [load]);

  async function toggleBlock() {
    const next = !blocked;
    if (next && !confirm("Block this traveller? You won't see their posts, comments or chat messages and they can't request to join your trips.")) return;
    try { await setBlocked(id, next); setBlockedState(next); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function toggleFollow() {
    const next = !following;
    setFollowingState(next);
    try {
      await setFollowing(id, next);
      setActivity((a) => (a ? { ...a, followers: a.followers + (next ? 1 : -1) } : a));
    } catch (e) { setFollowingState(!next); setError(e instanceof Error ? e.message : "Failed"); }
  }

  if (profile === undefined) return <p className="muted">{error ?? "Loading…"}</p>;
  if (profile === null) return <p>Profile not found. <Link href="/trips">Back to trips</Link></p>;

  const isMe = user?.id === id;
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const badges = activity ? computeBadges(activity, profile.phone_verified) : [];
  const rep = activity ? reputation(activity) : null;

  return (
    <>
      <div className="profileHead">
        <Avatar name={profile.display_name} avatarKey={profile.avatar_key} size={84} />
        <div>
          <h1 style={{ margin: 0 }}>{profile.display_name ?? "Traveller"} {profile.username && <small className="muted">@{profile.username}</small>}</h1>
          <p style={{ margin: "4px 0" }}><VerifiedBadge profile={profile} /></p>
          <p className="muted" style={{ margin: 0 }}>
            {profile.home_city ? `${profile.home_city} · ` : ""}Member since {joined}
            {profile.languages.length > 0 && ` · Speaks ${profile.languages.join(", ")}`}
          </p>
        </div>
      </div>
      {profile.bio && <p>{profile.bio}</p>}

      <p>
        {isMe ? (
          <Link href="/profile/edit" className="btn ghost" style={{ color: "var(--text)" }}>Edit profile &amp; verification</Link>
        ) : user ? (
          <>
            <button className={following ? "chip active" : "btn"} onClick={toggleFollow}>{following ? "✓ Following" : "+ Follow"}</button>{" "}
            <button className="chip" onClick={toggleBlock}>{blocked ? "Unblock" : "Block"}</button>{" "}
            <ReportButton targetUserId={id} label="Report this traveller" />
          </>
        ) : <Link href="/login" className="btn">Log in to follow</Link>}{" "}
        <ShareButton title={`${profile.display_name ?? "A traveller"} on YORVIA`} label="Share profile" />
      </p>
      {isAdmin && !isMe && (
        <div className="alert warn">
          <strong>Admin:</strong> {suspended ? "This account is suspended." : "This account is active."}{" "}
          {suspended ? (
            <button className="chip" onClick={async () => { try { await adminUnsuspend(id); setSuspended(false); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } }}>Lift suspension</button>
          ) : (
            <button className="chip" onClick={async () => {
              const why = prompt("Reason for suspending (the person will see this):");
              if (why === null) return;
              try { await adminSuspend(id, why.trim()); setSuspended(true); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
            }}>Suspend account</button>
          )}
          <small className="muted"> A suspended person can still log in and read, but can't post, comment, message, upload or use AI.</small>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="grid stats">
        <div className="card"><h3>{activity?.followers ?? 0}</h3><small>followers</small></div>
        <div className="card"><h3>{activity?.following ?? 0}</h3><small>following</small></div>
        <div className="card"><h3>{stats?.rating_avg ? `★ ${stats.rating_avg}` : "–"}</h3><small>{stats?.rating_count ?? 0} buddy rating(s)</small></div>
        <div className="card"><h3>{stats?.trips_joined ?? 0}</h3><small>trips completed with others</small></div>
        <div className="card"><h3>{stats?.trips_hosted ?? 0}</h3><small>trips organised</small></div>
        <div className="card"><h3>{rep?.points ?? 0}</h3><small>{rep?.level ?? "Newcomer"} · contribution points{rep?.next ? ` (next level at ${rep.next})` : ""}</small></div>
      </div>

      <h2>Badges</h2>
      {badges.length === 0 ? <p className="muted">No badges yet. They're earned by pinning places, reviewing, sharing photos and more.</p> : (
        <div className="badgeGrid">
          {badges.map((b) => (
            <span key={b.id} className={`bdg l${b.level}`} title={b.text}>{b.emoji} <b>{b.name}</b>{b.id !== "verified" && <small className="muted">{levelName(b.level)}</small>}</span>
          ))}
        </div>
      )}

      <h2>Travel passport</h2>
      {visited.length === 0 ? <p className="muted">Places reviewed will be stamped here.</p> : (
        <>
          <p className="muted">{visited.length} place{visited.length === 1 ? "" : "s"} reviewed</p>
          <div className="stamps">
            {visited.map((v) => <Link key={v.id} href={`/places/${v.id}`} className="stamp"><span className="e">{catEmoji(v.category)}</span>{v.title}</Link>)}
          </div>
        </>
      )}

      {collections.length > 0 && (
        <>
          <h2>Collections</h2>
          <div className="grid">
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.id}`} className="card"><h3>🗂️ {c.title}</h3><small className="muted">{c.place_count} place{c.place_count === 1 ? "" : "s"}</small></Link>
            ))}
          </div>
        </>
      )}

      <h2>Posts</h2>
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      <div className="feedCol">{posts.map((p) => <PostCard key={p.id} post={p} me={user?.id ?? null} onDeleted={(pid) => setPosts((cur) => cur.filter((x) => x.id !== pid))} />)}</div>

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
