import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import PageViewTracker from "@/components/PageViewTracker";
import RegisterSW from "@/components/RegisterSW";
import SetupBanner from "@/components/SetupBanner";
import SuspensionBanner from "@/components/SuspensionBanner";

export const metadata: Metadata = {
  title: "YORVIA – pin places, share trips, travel together",
  description: "Discover hidden places, read honest reviews with real prices, and share your travels.",
  applicationName: "YORVIA",
  appleWebApp: { capable: true, title: "YORVIA", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d9488" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        <PageViewTracker />
        <SetupBanner />
        <SuspensionBanner />
        <Header />
        <main className="container">{children}</main>
        <footer className="footer">YORVIA · pin places, share trips, travel together</footer>
        <BottomNav />
      </body>
    </html>
  );
}
