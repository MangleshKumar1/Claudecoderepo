"use client";
import dynamic from "next/dynamic";

// MapLibre needs the browser, so load it client-side only.
const MapLoader = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="mapPlaceholder">Loading map…</div>,
});

export default MapLoader;
