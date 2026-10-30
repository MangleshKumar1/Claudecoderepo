"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "@/lib/types";

type Props = {
  places?: Place[];
  height?: number;
  /** When set, clicking the map moves a draggable marker and reports coordinates. */
  onPick?: (lat: number, lng: number) => void;
  picked?: { lat: number; lng: number } | null;
  /** Extra labelled markers, e.g. the start and end of a route. */
  extra?: { lat: number; lng: number; color: string; label: string }[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
};

// MapLibre's demo tiles are for development only. For production set NEXT_PUBLIC_MAP_STYLE_URL to a
// style from MapTiler, Stadia Maps, etc. (e.g. https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY).
const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://demotiles.maplibre.org/style.json";

export default function Map({ places = [], height = 480, onPick, picked, extra = [], center, zoom }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const pickMarker = useRef<maplibregl.Marker | null>(null);
  const extraMarkers = useRef<maplibregl.Marker[]>([]);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: STYLE,
      center: center ?? [78, 22],
      zoom: zoom ?? 3.5,
    });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("click", (e) => onPickRef.current?.(e.lngLat.lat, e.lngLat.lng));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = places.map((p) => {
      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(
        `<strong>${escapeHtml(p.title)}</strong><br/><small>${escapeHtml(p.category)}</small><br/><a href="/places/${encodeURIComponent(p.id)}">Open</a>`,
      );
      return new maplibregl.Marker({ color: "#0ea5e9" }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(m);
    });
  }, [places]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (picked) {
      pickMarker.current = new maplibregl.Marker({ color: "#ef4444" }).setLngLat([picked.lng, picked.lat]).addTo(m);
    }
  }, [picked]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    extraMarkers.current.forEach((x) => x.remove());
    extraMarkers.current = extra.map((p) =>
      new maplibregl.Marker({ color: p.color })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setText(p.label))
        .addTo(m),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(extra)]);

  return <div ref={el} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
