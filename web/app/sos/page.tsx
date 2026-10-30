"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { addContact, deleteContact, listContacts, type EmergencyContact } from "@/lib/data";
import { useUser } from "@/lib/useUser";

export default function SOS() {
  const { user, loading } = useUser();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { track("sos_opened"); }, []);
  const load = useCallback(() => { if (user) listContacts().then(setContacts).catch((e) => setError(e.message)); }, [user]);
  useEffect(() => { load(); }, [load]);

  function locate() {
    if (!navigator.geolocation) return setStatus("This browser can't share your location.");
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setStatus(null); },
      () => setStatus("Couldn't get your location. Allow location access, or tell people where you are in words."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  const link = loc ? `https://www.google.com/maps?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}` : null;
  const message = `I need help. My location: ${link ?? "(location unavailable)"}`;
  const digits = (p: string) => p.replace(/\D/g, "");

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setBusy(true); setError(null);
    try {
      await addContact({ name: (f.get("name") as string).trim(), phone: (f.get("phone") as string).trim(), relation: ((f.get("relation") as string) || "").trim() || null });
      form.reset(); load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save"); }
    setBusy(false);
  }

  return (
    <>
      <h1>🆘 Emergency</h1>
      <div className="alert danger" style={{ fontSize: "1.05rem" }}>
        <strong>In immediate danger, call emergency services first.</strong>{" "}
        India: <a href="tel:112"><strong>112</strong></a> (police, fire, ambulance). Women's helpline: <a href="tel:181"><strong>181</strong></a>. Ambulance: <a href="tel:108"><strong>108</strong></a>.
      </div>
      <p>
        <a className="btn lg" href="tel:112" style={{ background: "var(--danger)", color: "#fff" }}>📞 Call 112</a>{" "}
        <button className="btn lg ghost" onClick={locate}>📍 Get my location</button>
      </p>
      {status && <p className="muted">{status}</p>}
      {loc && (
        <div className="card">
          <p style={{ margin: 0 }}><strong>Your location</strong> (shared only when you tap a button below)</p>
          <p className="muted" style={{ margin: "4px 0" }}>{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · <a href={link!} target="_blank" rel="noopener noreferrer">open in Maps</a></p>
          <div className="filters" style={{ margin: 0 }}>
            {typeof navigator !== "undefined" && "share" in navigator && <button className="chip" onClick={() => navigator.share({ text: message }).catch(() => {})}>↗ Share…</button>}
            <button className="chip" onClick={() => navigator.clipboard?.writeText(message).then(() => setStatus("Message copied."))}>📋 Copy message</button>
          </div>
        </div>
      )}

      <h2>Your emergency contacts</h2>
      {loading ? <p className="muted">Loading…</p> : !user ? (
        <p><Link href="/login">Log in</Link> to save emergency contacts. They're private to you and never shown to anyone else.</p>
      ) : (
        <>
          {contacts.length === 0 && <p className="muted">No contacts saved yet. Add up to 5 people you trust.</p>}
          {contacts.map((c) => (
            <div key={c.id} className="review">
              <strong>{c.name}</strong> {c.relation && <span className="muted">· {c.relation}</span>}<br />
              <span className="muted">{c.phone}</span>
              <div className="filters" style={{ margin: "6px 0 0" }}>
                <a className="chip" href={`tel:${c.phone}`}>📞 Call</a>
                <a className="chip" href={`sms:${c.phone}?body=${encodeURIComponent(message)}`}>💬 SMS my location</a>
                <a className="chip" href={`https://wa.me/${digits(c.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">🟢 WhatsApp my location</a>
                <button className="link error" onClick={() => deleteContact(c.id).then(load).catch((e) => setError(e.message))}>remove</button>
              </div>
            </div>
          ))}
          {!loc && contacts.length > 0 && <p className="muted"><small>Tap "Get my location" first so the SMS and WhatsApp buttons include where you are.</small></p>}
          <details className="tips"><summary>+ Add a contact</summary>
            <form className="stack" onSubmit={onAdd}>
              <label>Name<input name="name" required maxLength={60} /></label>
              <label>Phone (with country code)<input name="phone" required inputMode="tel" placeholder="+919876543210" /></label>
              <label>Relation (optional)<input name="relation" maxLength={40} placeholder="Mother, friend…" /></label>
              <button className="primary" disabled={busy}>Save contact</button>
            </form>
          </details>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <h2>Staying safe</h2>
      <ul>
        <li>Share your itinerary and a live location link with someone you trust before long trips.</li>
        <li>Phone signal can disappear in the hills. Save contacts and itineraries offline in advance.</li>
        <li>This page doesn't track you. Your location is read only when you tap "Get my location", and shared only through the buttons you press.</li>
      </ul>
    </>
  );
}
