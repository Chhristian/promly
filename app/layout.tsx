import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Promly: share a link, get paid when they show up",
  description: "Performance-based marketing marketplace: promote local businesses and earn commission on verified bookings.",
};

export const viewport: Viewport = {
  themeColor: "#f2f4f7",
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
