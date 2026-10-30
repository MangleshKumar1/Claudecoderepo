/** Forecast helpers for the free Open-Meteo service (no API key needed). */
export type Day = { date: string; code: number; max: number; min: number; rain: number; wind: number };
export type Alert = { level: "warn" | "danger"; text: string };

export const forecastUrl = (lat: number, lng: number) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;

/** Turns the service's response into a list of days. Returns [] if the shape isn't what we expect. */
export function parseForecast(json: unknown): Day[] {
  const d = (json as { daily?: Record<string, unknown> } | null)?.daily;
  if (!d || !Array.isArray(d.time)) return [];
  const arr = (k: string) => (Array.isArray(d[k]) ? (d[k] as (number | null)[]) : []);
  const [code, max, min, rain, wind] = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max"].map(arr);
  const out: Day[] = [];
  (d.time as string[]).forEach((date, i) => {
    if (typeof date !== "string") return;
    out.push({ date, code: Number(code[i] ?? 0), max: Number(max[i] ?? NaN), min: Number(min[i] ?? NaN), rain: Number(rain[i] ?? 0), wind: Number(wind[i] ?? 0) });
  });
  return out.filter((x) => Number.isFinite(x.max) && Number.isFinite(x.min));
}

const GROUPS: [number[], string, string][] = [
  [[0], "☀️", "Clear"], [[1, 2], "🌤️", "Mostly clear"], [[3], "☁️", "Cloudy"], [[45, 48], "🌫️", "Fog"],
  [[51, 53, 55, 56, 57], "🌦️", "Drizzle"], [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Rain"],
  [[71, 73, 75, 77, 85, 86], "❄️", "Snow"], [[95, 96, 99], "⛈️", "Thunderstorm"],
];
export function describe(code: number): { emoji: string; label: string } {
  const g = GROUPS.find(([codes]) => codes.includes(code));
  return g ? { emoji: g[1], label: g[2] } : { emoji: "🌡️", label: "Weather" };
}

/** Plain-language warnings. These are guidance, not official alerts. */
export function alertsFor(days: Day[]): Alert[] {
  const out: Alert[] = [];
  const day = (d: Day) => new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  for (const d of days) {
    if ([95, 96, 99].includes(d.code)) out.push({ level: "danger", text: `${day(d)}: thunderstorms forecast. Avoid open ridges, water bodies and exposed treks.` });
    if (d.rain >= 50) out.push({ level: "danger", text: `${day(d)}: very heavy rain (${Math.round(d.rain)} mm). Landslide and flood risk on hill roads and near rivers.` });
    else if (d.rain >= 20) out.push({ level: "warn", text: `${day(d)}: heavy rain (${Math.round(d.rain)} mm). Roads and trails may be slippery or closed.` });
    if ([71, 73, 75, 77, 85, 86].includes(d.code)) out.push({ level: "warn", text: `${day(d)}: snow forecast. Check road and pass status; carry chains and warm layers.` });
    if (d.wind >= 60) out.push({ level: "danger", text: `${day(d)}: very strong wind (${Math.round(d.wind)} km/h).` });
    else if (d.wind >= 40) out.push({ level: "warn", text: `${day(d)}: strong wind (${Math.round(d.wind)} km/h).` });
    if (d.max >= 40) out.push({ level: "warn", text: `${day(d)}: extreme heat (${Math.round(d.max)}°C). Hydrate and avoid midday outdoor activity.` });
    if (d.min <= 0) out.push({ level: "warn", text: `${day(d)}: freezing night (${Math.round(d.min)}°C).` });
  }
  // Most serious first, so a long list never hides a danger behind minor warnings. (sort is stable, so dates stay in order within a level)
  return out.sort((a, b) => Number(b.level === "danger") - Number(a.level === "danger")).slice(0, 6);
}
