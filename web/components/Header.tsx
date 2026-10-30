"use client";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

export default function Header() {
  const { user } = useUser();
  return (
    <header className="header">
      <Link href="/" className="brand">TripMates</Link>
      <nav>
        <Link href="/explore">Explore</Link>
        <Link href="/places/new">Pin a place</Link>
        <Link href="/saved">Saved</Link>
        {user ? (
          <button className="link" onClick={() => getSupabase()?.auth.signOut()}>Log out</button>
        ) : (
          <Link href="/login">Log in</Link>
        )}
      </nav>
    </header>
  );
}
