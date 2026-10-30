"use client";
import { useEffect, useState } from "react";
import { checkIsAdmin } from "./data";
import { useUser } from "./useUser";

/** True when the logged-in user is an admin. The real permission check happens in the database. */
export function useIsAdmin(): boolean {
  const { user } = useUser();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!user) { setAdmin(false); return; }
    checkIsAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, [user]);
  return admin;
}
