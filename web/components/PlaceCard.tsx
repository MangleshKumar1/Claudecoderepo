import Link from "next/link";
import { mediaUrl, uploadsEnabled } from "@/lib/media";
import type { Place } from "@/lib/types";

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <Link href={`/places/${place.id}`} className="card">
      {(place.cover_key && uploadsEnabled) || place.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cover" loading="lazy" alt="" src={place.cover_key && uploadsEnabled ? mediaUrl(place.cover_key) : place.photo_url!} />
      ) : null}
      <span className="tag">{place.category.replace("_", " ")}</span>
      <h3>{place.title}</h3>
      {place.description && <p>{place.description.slice(0, 110)}</p>}
      <small>
        {place.avg_rating ? `★ ${place.avg_rating} (${place.review_count})` : "No reviews yet"}
      </small>
    </Link>
  );
}
