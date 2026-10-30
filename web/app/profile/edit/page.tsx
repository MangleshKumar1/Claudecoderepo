"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { uploadsEnabled } from "@/lib/media";
import { uploadImage } from "@/lib/upload";
import {
  confirmPhone, getProfile, listBlocked, setAvatar, setBlocked, startPhoneVerification, updateProfile,
} from "@/lib/data";
import type { Profile } from "@/lib/types";
import { useUser } from "@/lib/useUser";

export default function EditProfile() {
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blocked, setBlockedList] = useState<{ id: string; name: string | null }[]>([]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setProfile(await getProfile(user.id));
    setBlockedList(await listBlocked());
  }, [user]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const fail = (e: unknown) => setMsg({ text: e instanceof Error ? e.message : "Something went wrong", ok: false });

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => ((f.get(k) as string) || "").trim() || null;
    setBusy(true);
    setMsg(null);
    try {
      await updateProfile({
        display_name: text("display_name"),
        username: text("username")?.toLowerCase() ?? null,
        bio: text("bio"),
        home_city: text("home_city"),
        languages: ((f.get("languages") as string) || "").split(",").map((s) => s.trim()).filter(Boolean),
      });
      setMsg({ text: "Profile saved.", ok: true });
      await load();
    } catch (err) { fail(err); }
    setBusy(false);
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      await setAvatar(await uploadImage(file, "avatars"));
      setMsg({ text: "Profile photo updated.", ok: true });
      await load();
    } catch (err) { fail(err); }
    e.target.value = "";
    setBusy(false);
  }

  async function sendCode() {
    setBusy(true);
    setMsg(null);
    try {
      await startPhoneVerification(phone.trim());
      setCodeSent(true);
      setMsg({ text: "Code sent by SMS.", ok: true });
    } catch (err) { fail(err); }
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    try {
      await confirmPhone(phone.trim(), code.trim());
      setMsg({ text: "Phone verified!", ok: true });
      setCodeSent(false);
      setCode("");
      await load();
    } catch (err) { fail(err); }
    setBusy(false);
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <p>Please <Link href="/login">log in</Link> to edit your profile.</p>;
  if (!profile) return <p className="muted">Loading profile…</p>;

  return (
    <>
      <h1>Your profile</h1>
      <div className="profileHead">
        <Avatar name={profile.display_name} avatarKey={profile.avatar_key} size={72} />
        <div>
          <p style={{ margin: "0 0 6px" }}><VerifiedBadge profile={profile} /> <Link href={`/profile/${user.id}`}>View public profile</Link></p>
          {uploadsEnabled && (
            <label className="chip" style={{ cursor: busy ? "wait" : "pointer" }}>
              📷 Change profile photo
              <input type="file" accept="image/*" hidden disabled={busy} onChange={onAvatar} />
            </label>
          )}
        </div>
      </div>

      <form className="stack" onSubmit={save}>
        <label>Display name<input name="display_name" required maxLength={60} defaultValue={profile.display_name ?? ""} /></label>
        <label>Username<input name="username" pattern="[a-zA-Z0-9_]{3,24}" title="3-24 letters, numbers or underscores" defaultValue={profile.username ?? ""} /></label>
        <label>Home city<input name="home_city" defaultValue={profile.home_city ?? ""} /></label>
        <label>Languages (comma separated)<input name="languages" placeholder="English, Hindi" defaultValue={profile.languages.join(", ")} /></label>
        <label>About you<textarea name="bio" maxLength={500} defaultValue={profile.bio ?? ""} /></label>
        <button className="primary" disabled={busy}>Save profile</button>
      </form>

      <h2>Verification</h2>
      <p className="muted">Verified profiles are trusted more. Your phone number is never shown to others, only the badge.</p>
      {profile.phone_verified ? (
        <p className="ok">Your phone is verified ✓</p>
      ) : (
        <div className="stack">
          <label>Phone number (with country code)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" inputMode="tel" />
          </label>
          {!codeSent ? (
            <button className="primary" disabled={busy || phone.trim().length < 8} onClick={sendCode}>Send code</button>
          ) : (
            <>
              <label>6-digit code<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} /></label>
              <button className="primary" disabled={busy || code.trim().length < 6} onClick={verify}>Verify</button>
            </>
          )}
        </div>
      )}
      {msg && <p className={msg.ok ? "ok" : "error"}>{msg.text}</p>}

      <h2>Blocked travellers</h2>
      {blocked.length === 0 && <p className="muted">You haven't blocked anyone.</p>}
      <ul>
        {blocked.map((b) => (
          <li key={b.id}>{b.name ?? "Traveller"}{" "}
            <button className="link" onClick={() => setBlocked(b.id, false).then(load).catch(fail)}>unblock</button>
          </li>
        ))}
      </ul>
    </>
  );
}
