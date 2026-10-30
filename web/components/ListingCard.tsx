import Link from "next/link";
import { mediaUrl, uploadsEnabled } from "@/lib/media";
import { LISTING_KINDS, type Listing } from "@/lib/types";

export const kindMeta = (k: string) => LISTING_KINDS.find(([key]) => key === k) ?? ["other", "📍", k];

export default function ListingCard({ l }: { l: Listing }) {
  const [, emoji, label] = kindMeta(l.kind);
  return (
    <Link href={`/directory/${l.id}`} className="card pad0">
      <div className="coverwrap">
        {l.photo_key && uploadsEnabled
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="cover" loading="lazy" alt="" src={mediaUrl(l.photo_key)} />
          : <div className="coverph" aria-hidden="true">{emoji}</div>}
        <span className="pill">{emoji} {label}</span>
      </div>
      <div className="body">
        <h3 style={{ margin: "0 0 4px" }}>{l.name} {l.verified && <span className="badge good" title="Checked by the YORVIA team">✓ Verified</span>}</h3>
        {l.city && <p style={{ margin: "0 0 4px" }}>📍 {l.city}</p>}
        <small className="muted">
          {l.price_from != null ? `From ₹${l.price_from.toLocaleString("en-IN")} ${l.price_unit ?? ""}` : "Ask for prices"}
          {l.status === "hidden" && " · Hidden"}{l.hidden_by_admin && " · Hidden by moderators"}
        </small>
      </div>
    </Link>
  );
}
