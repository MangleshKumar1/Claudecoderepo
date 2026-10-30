import { mediaUrl, uploadsEnabled } from "@/lib/media";

const COLORS = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#4d7c0f", "#0369a1"];

export default function Avatar({ name, avatarKey, size = 40 }: { name: string | null; avatarKey?: string | null; size?: number }) {
  const label = (name ?? "?").trim() || "?";
  const style = { width: size, height: size, borderRadius: "50%", flex: "none" as const };
  if (avatarKey && uploadsEnabled) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={mediaUrl(avatarKey)} alt="" style={{ ...style, objectFit: "cover" }} loading="lazy" />;
  }
  const color = COLORS[[...label].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span aria-hidden="true" style={{ ...style, background: color, color: "#fff", display: "inline-grid", placeItems: "center", fontWeight: 700, fontSize: size * 0.42 }}>
      {label[0].toUpperCase()}
    </span>
  );
}
