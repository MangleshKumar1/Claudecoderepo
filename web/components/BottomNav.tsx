"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/useUser";

const I = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  map: <><path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2z" /><path d="M9 3v16M15 5v16" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trips: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};
const Icon = ({ d }: { d: keyof typeof I }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[d]}</svg>
);

export default function BottomNav() {
  const path = usePathname() || "/";
  const { user } = useUser();
  const on = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/")) ? "on" : "";
  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      <Link href="/" className={on("/")}><Icon d="home" />Home</Link>
      <Link href="/explore" className={on("/explore")}><Icon d="map" />Explore</Link>
      <Link href="/places/new" className="fab" aria-label="Pin a place"><span className="circle"><Icon d="plus" /></span></Link>
      <Link href="/trips" className={on("/trips")}><Icon d="trips" />Trips</Link>
      <Link href={user ? "/profile/edit" : "/login"} className={on("/profile") || on("/login")}><Icon d="me" />{user ? "Me" : "Log in"}</Link>
    </nav>
  );
}
