import Link from "next/link";
import { catEmoji, catLabel } from "@/lib/categories";
import { mediaUrl, uploadsEnabled } from "@/lib/media";
import type { Place } from "@/lib/types";

export default function PlaceCard({ place }: { place: Place }) {
  const img = place.cover_key && uploadsEnabled ? mediaUrl(place.cover_key) : place.photo_url;
  return (
    <Link href={`/places/${place.id}`} className="card pad0">
      <div className="coverwrap">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cover" loading="lazy" alt="" src={img} />
        ) : (
          <div className="coverph" aria-hidden="true">{catEmoji(place.category)}</div>
        )}
        <span className="pill">{catEmoji(place.category)} {catLabel(place.category)}</span>
      </div>
      <div className="body">
        <h3 style={{ margin: "0 0 4px" }}>{place.title}</h3>
        {place.description && <p>{place.description.slice(0, 96)}{place.description.length > 96 ? "…" : ""}</p>}
        <small className="muted">
          {place.avg_rating ? `★ ${place.avg_rating} · ${place.review_count} review${place.review_count === 1 ? "" : "s"}` : "No reviews yet"}
        </small>
      </div>
    </Link>
  );
}
