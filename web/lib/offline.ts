import type { Itinerary, ItineraryItem } from "./types";

const KEY = "yorvia_offline_packs";

export type OfflinePack = {
  id: string; title: string; destination: string; savedAt: string;
  extra_notes: string | null;
  items: Pick<ItineraryItem, "day" | "position" | "time_of_day" | "title" | "description" | "est_cost" | "lat" | "lng">[];
};

function read(): OfflinePack[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(packs: OfflinePack[]) {
  localStorage.setItem(KEY, JSON.stringify(packs));
}

export const isSavedOffline = (id: string) => read().some((p) => p.id === id);

export function saveOffline(it: Itinerary, items: ItineraryItem[]) {
  const pack: OfflinePack = {
    id: it.id, title: it.title, destination: it.destination, savedAt: new Date().toISOString(), extra_notes: it.extra_notes,
    items: items.map(({ day, position, time_of_day, title, description, est_cost, lat, lng }) =>
      ({ day, position, time_of_day, title, description, est_cost, lat, lng })),
  };
  write([pack, ...read().filter((p) => p.id !== it.id)].slice(0, 10));
}

export function removeOffline(id: string) {
  write(read().filter((p) => p.id !== id));
}

/** Called on logout so saved private itineraries don't stay on a shared device. */
export function clearOffline() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
