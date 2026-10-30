import Link from "next/link";
import type { Place } from "@/lib/types";

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <Link href={`/places/${place.id}`} className="card">
      <span className="tag">{place.category}</span>
      <h3>{place.title}</h3>
      {place.description && <p>{place.description.slice(0, 110)}</p>}
      <small>
        {place.avg_rating ? `★ ${place.avg_rating} (${place.review_count})` : "No reviews yet"}
      </small>
    </Link>
  );
}
