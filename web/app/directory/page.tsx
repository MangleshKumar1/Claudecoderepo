"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/ListingCard";
import { CardSkeletons } from "@/components/Skeletons";
import { listListings } from "@/lib/data";
import { LISTING_KINDS, type Listing, type ListingKind } from "@/lib/types";

export default function Directory() {
  const [kind, setKind] = useState<ListingKind | "all">("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setItems(null); listListings({ kind }).then(setItems).catch((e) => setError(e.message)); }, [kind]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter((l) => !s || [l.name, l.city, l.description].some((t) => (t ?? "").toLowerCase().includes(s)));
  }, [items, q]);

  return (
    <>
      <h1>Local guides &amp; businesses</h1>
      <p className="muted">Homestays, guides, drivers, activity and tour operators. Send an enquiry and they reply directly. Nothing is booked or paid for through YORVIA yet, so always confirm details and verify the business yourself.</p>
      <p><Link href="/directory/new" className="btn">+ List your business</Link>{" "}<Link href="/directory/mine" className="chip">My listings &amp; enquiries</Link></p>
      <input className="searchbar" style={{ maxWidth: 480, width: "100%" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city…" aria-label="Search the directory" />
      <div className="filters" role="group" aria-label="Filter by type">
        <button className={`chip ${kind === "all" ? "active" : ""}`} onClick={() => setKind("all")}>All</button>
        {LISTING_KINDS.map(([k, e, label]) => <button key={k} className={`chip ${kind === k ? "active" : ""}`} onClick={() => setKind(k)}>{e} {label}</button>)}
      </div>
      {error && <p className="error">{error}</p>}
      {!items && !error && <CardSkeletons />}
      {items && shown.length === 0 && <EmptyState emoji="🏔️" title="No listings here yet" text="Run a homestay, guide trips, or rent vehicles? Be the first to list." href="/directory/new" action="List your business" />}
      <div className="grid">{shown.map((l) => <ListingCard key={l.id} l={l} />)}</div>
      <p className="muted"><small>"Verified" means the YORVIA team checked the business. It is not a guarantee of quality or safety. Report anything suspicious from the listing page.</small></p>
    </>
  );
}
