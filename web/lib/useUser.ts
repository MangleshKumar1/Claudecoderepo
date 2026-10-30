"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
