"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { getSupabase } from "@/lib/supabase";
import { clearOffline } from "@/lib/offline";
import { useUser } from "@/lib/useUser";

const MAIN = [
  ["/explore", "Explore"],
  ["/feed", "Feed"],
  ["/trips", "Trips"],
  ["/itineraries", "Itineraries"],
] as const;
const MORE = [
  ["/collections", "🗂️ Collections"],
  ["/route", "🛣️ Along a route"],
  ["/places/new", "📍 Pin a place"],
  ["/saved", "★ Saved"],
] as const;

export default function Header() {
  const { user } = useUser();
  const path = usePathname() || "/";
  const on = (href: string) => (path === href || path.startsWith(href + "/") ? "on" : "");
  return (
    <header className="header">
      <Link href="/" className="brand"><Logo />YORVIA</Link>
      <nav className="nav-desktop" aria-label="Main">
        {MAIN.map(([href, label]) => <Link key={href} href={href} className={on(href)}>{label}</Link>)}
        <details className="more">
          <summary>More ▾</summary>
          <div className="menu">{MORE.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</div>
        </details>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <Link href="/profile/edit" className="chip">Profile</Link>
            <button className="chip" onClick={() => { clearOffline(); getSupabase()?.auth.signOut(); }}>Log out</button>
          </>
        ) : (
          <Link href="/login" className="btn">Log in</Link>
        )}
      </div>
    </header>
  );
}
