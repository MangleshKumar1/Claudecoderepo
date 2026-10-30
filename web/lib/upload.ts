import { compressImage } from "./image";
import { MAX_UPLOAD_BYTES } from "./media";
import { getSupabase } from "./supabase";

/** Compresses a photo, uploads it straight to the media bucket, and returns its storage key. */
export type UploadKind = "places" | "posts" | "avatars";

export async function uploadImage(file: File, kind: UploadKind = "places"): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please log in first");

  const blob = await compressImage(file);
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" is still too large after compression.`);

  // 1. Ask our server for a short-lived, single-use upload link
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ contentType: "image/jpeg", size: blob.size, kind }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Could not start the upload.");

  // 2. Send the file directly to the bucket (it never passes through our server)
  const put = await fetch(body.uploadUrl as string, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!put.ok) throw new Error("The upload failed. Please try again.");
  return body.key as string;
}
