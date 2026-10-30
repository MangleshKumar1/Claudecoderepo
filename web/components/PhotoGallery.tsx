"use client";
import { useState } from "react";
import { deletePlacePhoto } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import type { PlacePhoto } from "@/lib/types";
import ReportButton from "./ReportButton";

export default function PhotoGallery({ photos, me, placeId, onChange }: {
  photos: PlacePhoto[]; me: string | null; placeId: string; onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  if (photos.length === 0) return null;

  async function remove(id: string) {
    if (!confirm("Delete this photo?")) return;
    setBusyId(id);
    setError(null);
    try { await deletePlacePhoto(id); onChange(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    setBusyId(null);
  }

  return (
    <>
      <div className="gallery">
        {photos.map((p) => (
          <figure key={p.id}>
            <a href={mediaUrl(p.storage_key)} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(p.storage_key)} alt={p.caption ?? "Photo from a traveller"} loading="lazy" />
            </a>
            <figcaption>
              <small className="muted">by {p.uploader ?? "traveller"}</small>{" "}
              {p.user_id === me ? (
                <button className="link error" disabled={busyId === p.id} onClick={() => remove(p.id)}>delete</button>
              ) : (
                <ReportButton targetUserId={p.user_id} label="report" />
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <span hidden>{placeId}</span>
    </>
  );
}
