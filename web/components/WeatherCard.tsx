"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { alertsFor, describe, forecastUrl, parseForecast, type Day } from "@/lib/weather";

const TTL_MS = 30 * 60 * 1000;

export default function WeatherCard({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const key = `yorvia_wx_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || "null") as { at: number; days: Day[] } | null;
      if (hit && Date.now() - hit.at < TTL_MS) { setDays(hit.days); return; }
    } catch { /* ignore */ }
    const ctl = new AbortController();
    fetch(forecastUrl(lat, lng), { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((json) => {
        const parsed = parseForecast(json);
        if (parsed.length === 0) throw new Error("empty");
        setDays(parsed);
        track("weather_checked");
        try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), days: parsed })); } catch { /* ignore */ }
      })
      .catch((e) => { if (e?.name !== "AbortError") setError(true); });
    return () => ctl.abort();
  }, [lat, lng]);

  if (error) return <p className="muted"><small>Weather forecast isn't available right now.</small></p>;
  if (!days) return <div className="skeleton" style={{ height: 120 }} aria-busy="true" />;
  const alerts = alertsFor(days);
  return (
    <section aria-label="Weather forecast">
      <h2>Weather{label ? ` in ${label}` : ""}: next 7 days</h2>
      {alerts.map((a, i) => <p key={i} className={`alert ${a.level}`}>{a.level === "danger" ? "⚠️" : "🔶"} {a.text}</p>)}
      <div className="scroller" role="list">
        {days.map((d) => {
          const w = describe(d.code);
          return (
            <div key={d.date} role="listitem" className="wx">
              <small className="muted">{new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</small>
              <span className="wxe" title={w.label}>{w.emoji}</span>
              <strong>{Math.round(d.max)}°</strong><small className="muted">{Math.round(d.min)}°</small>
              {d.rain >= 1 && <small>💧{Math.round(d.rain)}mm</small>}
            </div>
          );
        })}
      </div>
      <p className="muted"><small>Forecast from Open-Meteo. These are guidance, not official warnings. Check IMD or local authorities before you travel, especially in the hills and monsoon season.</small></p>
    </section>
  );
}
