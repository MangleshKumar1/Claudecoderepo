"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/ListingCard";
import { countNewEnquiries, listListings, listMyEnquiries } from "@/lib/data";
import type { Enquiry, Listing } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function Mine() {
  const { user, loading } = useUser();
  const [mine, setMine] = useState<Listing[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [enq, setEnq] = useState<Enquiry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listListings({ mine: true }).then(async (ls) => { setMine(ls); setCounts(await countNewEnquiries(ls.map((l) => l.id))); }).catch((e) => setError(e.message));
    listMyEnquiries().then(setEnq).catch((e) => setError(e.message));
  }, [user]);

  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to see your listings and enquiries.</p>;
  return (
    <>
      <h1>Your listings &amp; enquiries</h1>
      {error && <p className="error">{error}</p>}
      <h2>Your businesses</h2>
      {mine.length === 0 ? <EmptyState emoji="🏡" title="No listings yet" text="List a homestay, guide service, vehicle or activity." href="/directory/new" action="List your business" /> : (
        <div className="grid">
          {mine.map((l) => (
            <div key={l.id}>
              {counts[l.id] > 0 && <small className="error"><strong>{counts[l.id]} new enquir{counts[l.id] === 1 ? "y" : "ies"}</strong></small>}
              <ListingCard l={l} />
            </div>
          ))}
        </div>
      )}
      <h2>Enquiries you sent</h2>
      {enq.length === 0 && <p className="muted">You haven't contacted any businesses yet. <Link href="/directory">Browse the directory</Link>.</p>}
      {enq.map((x) => (
        <div key={x.id} className="review">
          <Link href={`/directory/${x.listing_id}`}><strong>{x.listing_name ?? "A business"}</strong></Link> <span className={`badge ${x.status === "replied" ? "good" : ""}`}>{x.status}</span>
          <p style={{ margin: "4px 0" }}>{x.message}</p>
          {x.owner_reply ? <p className="ok" style={{ margin: 0 }}>Reply: {x.owner_reply}</p> : <small className="muted">Waiting for a reply.</small>}
        </div>
      ))}
    </>
  );
}
