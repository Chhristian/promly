import type { MetadataRoute } from "next";

// Makes Promly installable as a home-screen app. No service worker and no
// offline caching on purpose: every page still loads live from the server.
// Icons are drawn from lib/logo-mark.ts by scripts/pwa-icons.ts (npm run pwa-icons).
// Colours are Paper (#F4F6FA), the same as the viewport themeColor in app/layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Promly",
    short_name: "Promly",
    description: "Refer a sale, get paid when the customer shows up.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F6FA",
    theme_color: "#F4F6FA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
