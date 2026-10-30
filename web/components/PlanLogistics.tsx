const BOOKING_AID = process.env.NEXT_PUBLIC_BOOKING_AID;

type Props = { destination: string; origin?: string | null; lat?: number | null; lng?: number | null; checkin?: string | null; checkout?: string | null };

/**
 * Links out to other websites for the logistics we don't handle ourselves yet.
 * No bookings happen on YORVIA. If you join an affiliate programme later, set NEXT_PUBLIC_BOOKING_AID.
 */
export default function PlanLogistics({ destination, origin, lat, lng, checkin, checkout }: Props) {
  const enc = encodeURIComponent;
  const stays = `https://www.booking.com/searchresults.html?ss=${enc(destination)}${checkin ? `&checkin=${checkin}` : ""}${checkout ? `&checkout=${checkout}` : ""}${BOOKING_AID ? `&aid=${enc(BOOKING_AID)}` : ""}`;
  const dest = lat != null && lng != null ? `${lat},${lng}` : destination;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${enc(dest)}${origin ? `&origin=${enc(origin)}` : ""}&travelmode=driving`;
  const links: [string, string, string][] = [
    ["🛏️", "Find stays", stays],
    ["🧭", "Driving directions", directions],
    ["🚆", "Trains (IRCTC)", "https://www.irctc.co.in/"],
    ["🚌", "Buses (redBus)", "https://www.redbus.in/"],
  ];
  return (
    <section>
      <h2>Plan the logistics</h2>
      <div className="scroller">
        {links.map(([e, label, href]) => (
          <a key={label} className="chip" href={href} target="_blank" rel={`noopener noreferrer${BOOKING_AID && label === "Find stays" ? " sponsored" : ""}`}>{e} {label} ↗</a>
        ))}
      </div>
      <p className="muted"><small>These open other websites. Prices and availability are theirs, not ours.{BOOKING_AID ? " We may earn a commission if you book through the stays link, at no cost to you." : ""}</small></p>
    </section>
  );
}
