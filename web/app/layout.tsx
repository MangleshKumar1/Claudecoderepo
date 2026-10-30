import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SetupBanner from "@/components/SetupBanner";

export const metadata: Metadata = {
  title: "TripMates – pin places, share trips, travel together",
  description: "Discover hidden places, read honest reviews with real prices, and share your travels.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SetupBanner />
        <Header />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
