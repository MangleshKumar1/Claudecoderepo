import Link from "next/link";
import type { Itinerary } from "@/lib/types";

export default function ItineraryCard({ it }: { it: Itinerary }) {
  return (
    <Link href={`/itineraries/${it.id}`} className="card">
      <span className="tag">{it.num_days} day{it.num_days === 1 ? "" : "s"}</span>{" "}
      {it.ai_generated && <span className="badge">AI-assisted</span>}{" "}
      {it.is_public ? <span className="badge good">Public</span> : <span className="badge">Private</span>}
      <h3>{it.title}</h3>
      <p>{it.destination}{it.owner ? ` · by ${it.owner}` : ""}</p>
      {it.summary && <small className="muted">{it.summary.slice(0, 110)}</small>}
    </Link>
  );
}
