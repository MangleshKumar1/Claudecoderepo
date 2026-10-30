import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, type AllowedType } from "@/lib/media";

export const runtime = "nodejs";

const DAILY_LIMIT = Number(process.env.UPLOADS_PER_DAY || 30);

function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    bucket: R2_BUCKET,
    client: new S3Client({
      region: "auto",
      // Newer AWS SDKs add a checksum of the (empty) body to presigned links by default, which makes
      // the real upload fail with a checksum mismatch. Only add checksums when a service requires them.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

/** Admins (rows in the admins table) may remove other people's content. The check runs in the database. */
async function isAdmin(sb: SupabaseClient): Promise<boolean> {
  const { data } = await sb.rpc("is_admin");
  return data === true;
}

async function authedClient(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anon || !token) return null;
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { sb, uid: data.user.id };
}

/** Issues a short-lived upload link for one image. The file goes straight to R2. */
export async function POST(req: Request) {
  const storage = r2();
  if (!storage) return NextResponse.json({ error: "Photo uploads aren't set up yet." }, { status: 503 });
  const auth = await authedClient(req);
  if (!auth) return NextResponse.json({ error: "Please log in to upload photos." }, { status: 401 });

  let body: { contentType?: unknown; size?: unknown; kind?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const contentType = body.contentType as AllowedType;
  const size = Number(body.size);
  const kind = (["places", "posts", "avatars", "listings"] as const).find((k) => k === body.kind) ?? "places";
  if (!(contentType in ALLOWED_TYPES)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 400 });
  }
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Images must be under 5 MB." }, { status: 400 });
  }

  // Daily cap per user (also logs the upload so orphaned files can be found later)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await auth.sb.from("media_uploads").select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Daily upload limit reached (${DAILY_LIMIT} photos). Try again tomorrow.` }, { status: 429 });
  }

  const key = `${kind}/${auth.uid}/${randomUUID()}.${ALLOWED_TYPES[contentType]}`;
  const { error: logErr } = await auth.sb.from("media_uploads").insert({ user_id: auth.uid, storage_key: key, bytes: size });
  if (logErr) return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });

  try {
    // Type and size are part of the signature, so the browser can't send anything else with this link.
    const uploadUrl = await getSignedUrl(
      storage.client,
      new PutObjectCommand({ Bucket: storage.bucket, Key: key, ContentType: contentType, ContentLength: size, CacheControl: "public, max-age=31536000, immutable" }),
      { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) },
    );
    return NextResponse.json({ key, uploadUrl });
  } catch (e) {
    console.error("Could not sign upload", e);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }
}

/** Deletes one of your photos from the database and from the bucket. */
export async function DELETE(req: Request) {
  const storage = r2();
  if (!storage) return NextResponse.json({ error: "Photo uploads aren't set up yet." }, { status: 503 });
  const auth = await authedClient(req);
  if (!auth) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const params = new URL(req.url).searchParams;

  // Delete one of your posts together with its photo files
  const postId = params.get("post");
  if (postId) {
    if (!/^[0-9a-f-]{36}$/i.test(postId)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
    const { data: post } = await auth.sb.from("posts").select("id,user_id").eq("id", postId).maybeSingle();
    if (!post || (post.user_id !== auth.uid && !(await isAdmin(auth.sb)))) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const { data: photos } = await auth.sb.from("post_photos").select("storage_key").eq("post_id", postId);
    const { error: delErr } = await auth.sb.from("posts").delete().eq("id", postId);
    if (delErr) return NextResponse.json({ error: "Could not delete the post." }, { status: 500 });
    for (const p of photos ?? []) {
      try {
        await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: p.storage_key }));
      } catch (e) {
        console.error("Post deleted but a file could not be removed", p.storage_key, e);
      }
    }
    return NextResponse.json({ ok: true });
  }

  const id = params.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { data: row } = await auth.sb.from("place_photos").select("storage_key,user_id").eq("id", id).maybeSingle();
  if (!row || (row.user_id !== auth.uid && !(await isAdmin(auth.sb)))) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const { error } = await auth.sb.from("place_photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete the photo." }, { status: 500 });

  try {
    await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: row.storage_key }));
  } catch (e) {
    console.error("Photo row deleted but the file could not be removed", row.storage_key, e); // orphan; harmless, cleanable later
  }
  return NextResponse.json({ ok: true });
}
