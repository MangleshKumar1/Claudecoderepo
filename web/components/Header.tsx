"use client";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

export default function Header() {
  const { user } = useUser();
  return (
    <header className="header">
      <Link href="/" className="brand">YORVIA</Link>
      <nav>
        <Link href="/explore">Explore</Link>
        <Link href="/route">Along a route</Link>
        <Link href="/trips">Trips</Link>
        <Link href="/itineraries">Itineraries</Link>
        <Link href="/places/new">Pin a place</Link>
        <Link href="/saved">Saved</Link>
        {user ? (
          <>
            <Link href="/profile/edit">Profile</Link>
            <button className="link" onClick={() => getSupabase()?.auth.signOut()}>Log out</button>
          </>
        ) : (
          <Link href="/login">Log in</Link>
        )}
      </nav>
    </header>
  );
}
