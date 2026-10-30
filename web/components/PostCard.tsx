"use client";
import Link from "next/link";
import { useState } from "react";
import { addComment, deleteComment, deletePost, listComments, setLiked } from "@/lib/data";
import { mediaUrl, uploadsEnabled } from "@/lib/media";
import { timeAgo } from "@/lib/time";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { Post, PostComment } from "@/lib/types";
import Avatar from "./Avatar";
import ReportButton from "./ReportButton";
import ShareButton from "./ShareButton";

export default function PostCard({ post, me, onDeleted }: { post: Post; me: string | null; onDeleted?: (id: string) => void }) {
  const [p, setP] = useState(post);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = useIsAdmin();

  async function like() {
    if (!me) return setError("Log in to like posts.");
    const next = !p.liked_by_me;
    setP({ ...p, liked_by_me: next, likes: p.likes + (next ? 1 : -1) }); // optimistic
    try { await setLiked(p.id, next); } catch (e) {
      setP(p);
      setError(e instanceof Error ? e.message : "Could not update like");
    }
  }

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try { setComments(await listComments(p.id)); } catch (e) { setError(e instanceof Error ? e.message : "Could not load comments"); }
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      await addComment(p.id, body);
      setText("");
      setComments(await listComments(p.id));
      setP((x) => ({ ...x, comments: x.comments + 1 }));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not post comment"); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this post?")) return;
    setBusy(true);
    try { await deletePost(p.id); onDeleted?.(p.id); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete"); setBusy(false); }
  }

  const shown = uploadsEnabled ? p.photos : [];
  return (
    <article className="card post">
      <header className="postHead">
        <Avatar name={p.author_name} avatarKey={p.author_avatar} />
        <div>
          <Link href={`/profile/${p.user_id}`}><strong>{p.author_name ?? "Traveller"}</strong></Link>
          <div className="muted"><small>{timeAgo(p.created_at)}{p.place_id && p.place_title && <> · 📍 <Link href={`/places/${p.place_id}`}>{p.place_title}</Link></>}</small></div>
        </div>
      </header>
      <p className="postBody">{p.body}</p>
      {shown.length > 0 && (
        <div className={`postPhotos n${Math.min(shown.length, 4)}`}>
          {shown.map((ph) => (
            <a key={ph.id} href={mediaUrl(ph.storage_key)} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(ph.storage_key)} alt="Travel photo" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <div className="postActions">
        <button className={`chip ${p.liked_by_me ? "active" : ""}`} onClick={like} aria-pressed={p.liked_by_me}>{p.liked_by_me ? "♥" : "♡"} {p.likes}</button>
        <button className="chip" onClick={toggleComments} aria-expanded={open}>💬 {p.comments}</button>
        <ShareButton title="A post on YORVIA" path={`/posts/${p.id}`} />
        {me === p.user_id
          ? <button className="link error" disabled={busy} onClick={remove}>delete</button>
          : <ReportButton targetUserId={p.user_id} label="report" />}
        {isAdmin && me !== p.user_id && <button className="link error" disabled={busy} onClick={remove}>remove (admin)</button>}
      </div>
      {open && (
        <div className="comments">
          {comments === null && <small className="muted">Loading…</small>}
          {comments?.length === 0 && <small className="muted">No comments yet.</small>}
          {comments?.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author_name} avatarKey={c.author_avatar} size={28} />
              <div>
                <Link href={`/profile/${c.user_id}`}><strong>{c.author_name ?? "Traveller"}</strong></Link>{" "}
                <small className="muted">{timeAgo(c.created_at)}</small>
                <div>{c.body}</div>
                {(me === c.user_id || me === p.user_id || isAdmin) && (
                  <button className="link error" onClick={() => deleteComment(c.id).then(async () => { setComments(await listComments(p.id)); setP((x) => ({ ...x, comments: Math.max(0, x.comments - 1) })); }).catch((e) => setError(e.message))}><small>delete</small></button>
                )}
              </div>
            </div>
          ))}
          {me ? (
            <form className="chatForm" onSubmit={submitComment}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" maxLength={500} />
              <button className="primary" disabled={busy}>Post</button>
            </form>
          ) : <small className="muted"><Link href="/login">Log in</Link> to comment.</small>}
        </div>
      )}
      {error && <p className="error"><small>{error}</small></p>}
    </article>
  );
}
