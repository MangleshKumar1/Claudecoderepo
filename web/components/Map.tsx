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
  center?: [number, number]; // [lng, lat]
  zoom?: number;
};

const STYLE = "https://demotiles.maplibre.org/style.json"; // swap for MapTiler/Stadia/Mapbox in production

export default function Map({ places = [], height = 480, onPick, picked, center, zoom }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const pickMarker = useRef<maplibregl.Marker | null>(null);
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

  return <div ref={el} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
