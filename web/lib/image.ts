/**
 * Shrinks a photo in the browser before upload: max 1600px on the long side, re-encoded as JPEG.
 * This cuts storage and bandwidth costs a lot, and as a side effect strips EXIF metadata
 * (including the GPS location phones embed in photos), which is better for users' privacy.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" isn't an image.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the photo's rotation
  } catch {
    throw new Error(`"${file.name}" couldn't be read. Please use a JPG, PNG or WebP photo.`);
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white instead of black in JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not compress the image.");
  return blob;
}
