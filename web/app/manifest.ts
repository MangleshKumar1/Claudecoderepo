import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YORVIA",
    short_name: "YORVIA",
    description: "Pin places, share trips, travel together.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#0d9488",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
