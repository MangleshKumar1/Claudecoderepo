/**
 * Public base URL of the media bucket (Cloudflare R2), e.g. https://media.example.com
 * Safe to expose: it's just where public images are served from.
 */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");

export const uploadsEnabled = Boolean(BASE);

export function mediaUrl(storageKey: string): string {
  return `${BASE}/${storageKey}`;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // after in-browser compression
export const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type AllowedType = keyof typeof ALLOWED_TYPES;
