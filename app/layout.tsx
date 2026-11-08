import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Promly: refer a sale, get paid when the customer shows up",
  description: "Performance-based marketing marketplace: promote businesses that sell online (tours, rentals, experiences, tickets) and earn commission on verified bookings.",
  // iOS home-screen app. "default" keeps the status bar opaque, so the sticky header is never under the notch.
  // The apple-touch-icon comes from app/apple-icon.png; the manifest from app/manifest.ts.
  appleWebApp: { capable: true, title: "Promly", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F4F6FA",
  width: "device-width",
  initialScale: 1,
};

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${schibsted.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
