"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return setMsg({ text: "Supabase is not configured yet.", ok: false });
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "login"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg({ text: error.message, ok: false });
    if (mode === "signup") return setMsg({ text: "Check your email to confirm your account.", ok: true });
    router.push("/");
  }

  return (
    <>
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>
      <form className="stack" onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
        {msg && <p className={msg.ok ? "ok" : "error"}>{msg.text}</p>}
      </form>
      <p>
        <button className="link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </p>
    </>
  );
}
