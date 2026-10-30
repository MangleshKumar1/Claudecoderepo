"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import { CardSkeletons } from "@/components/Skeletons";
import { listFollowingIds, listPosts, POSTS_PAGE } from "@/lib/data";
import type { Post } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function Feed() {
  const { user } = useUser();
  const [tab, setTab] = useState<"latest" | "following">("latest");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (before?: string) => {
    const userIds = tab === "following" ? await listFollowingIds() : undefined;
    return listPosts({ userIds, before });
  }, [tab]);

  const reload = useCallback(() => {
    setPosts(null);
    setError(null);
    fetchPage().then((p) => { setPosts(p); setMore(p.length === POSTS_PAGE); }).catch((e) => setError(e.message));
  }, [fetchPage]);
  useEffect(() => { reload(); }, [reload, user?.id]);

  async function loadMore() {
    if (!posts?.length) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(posts[posts.length - 1].created_at);
      setPosts([...posts, ...next]);
      setMore(next.length === POSTS_PAGE);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load more"); }
    setLoadingMore(false);
  }

  return (
    <>
      <h1>Travel feed</h1>
      <div className="filters">
        <button className={`chip ${tab === "latest" ? "active" : ""}`} onClick={() => setTab("latest")}>Latest</button>
        <button className={`chip ${tab === "following" ? "active" : ""}`} onClick={() => setTab("following")}>Following</button>
      </div>
      <div className="feedCol">
        {user ? <PostComposer onPosted={reload} /> : <p className="muted"><Link href="/login">Log in</Link> to share your own posts, like and comment.</p>}
        {error && <p className="error">{error}</p>}
        {!posts && !error && <CardSkeletons n={3} />}
        {posts && posts.length === 0 && (tab === "following"
          ? <EmptyState emoji="👥" title="Nothing here yet" text={user ? "Follow travellers from their profiles to see their posts here." : "Log in to see posts from people you follow."} href={user ? "/feed" : "/login"} action={user ? "See latest posts" : "Log in"} />
          : <EmptyState emoji="📸" title="No posts yet" text="Be the first to share a story or a photo from a trip." />)}
        {posts?.map((p) => <PostCard key={p.id} post={p} me={user?.id ?? null} onDeleted={(id) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? null)} />)}
        {more && <button className="chip" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button>}
      </div>
    </>
  );
}
