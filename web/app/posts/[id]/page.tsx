"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import { CardSkeletons } from "@/components/Skeletons";
import { listPosts } from "@/lib/data";
import type { Post } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => { listPosts({ postId: id }).then((r) => setPost(r[0] ?? null)).catch(() => setPost(null)); }, [id, user?.id]);
  if (post === undefined) return <CardSkeletons n={1} />;
  if (post === null) return <p>Post not found. <Link href="/feed">Back to the feed</Link></p>;
  return <div className="feedCol"><PostCard post={post} me={user?.id ?? null} onDeleted={() => { window.location.href = "/feed"; }} /></div>;
}
