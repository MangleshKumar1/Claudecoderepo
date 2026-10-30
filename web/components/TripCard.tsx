import Link from "next/link";
import type { Trip } from "@/lib/types";

export function fmtRange(t: Trip) {
  const f = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${f(t.start_date)} – ${f(t.end_date)}`;
}

export default function TripCard({ trip, note }: { trip: Trip; note?: string }) {
  const spots = trip.max_buddies - (trip.member_count ?? 0);
  return (
    <Link href={`/trips/${trip.id}`} className="card">
      <span className="tag">{trip.style}</span>
      <h3>{trip.title}</h3>
      <p>{trip.origin ? `${trip.origin} → ` : ""}{trip.destination}</p>
      <p style={{ marginBottom: 6 }}>📅 {fmtRange(trip)}{trip.budget_per_person != null ? ` · ~₹${trip.budget_per_person.toLocaleString("en-IN")}/person` : ""}</p>
      <small className={spots > 0 ? "ok" : "muted"}>
        {spots > 0 ? `${spots} spot${spots === 1 ? "" : "s"} open` : "Full"}
        {note ? ` · ${note}` : ""}
      </small>
    </Link>
  );
}
