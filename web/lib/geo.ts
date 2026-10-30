/** Distance in km between two points on the Earth (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(bLat - aLat) / 2) ** 2 +
    Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export type LatLng = { lat: number; lng: number };

/**
 * Distance in km from point P to the straight segment A-B, and how far along the segment
 * (0 = at A, 1 = at B) the closest point is. Uses a local flat-earth projection, which is
 * accurate enough for corridors up to a few hundred km. This is a straight line, not a road route.
 */
export function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): { km: number; t: number } {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(((a.lat + b.lat) / 2 * Math.PI) / 180);
  const ax = a.lng * kmPerDegLng, ay = a.lat * kmPerDegLat;
  const bx = b.lng * kmPerDegLng, by = b.lat * kmPerDegLat;
  const px = p.lng * kmPerDegLng, py = p.lat * kmPerDegLat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return { km: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}
