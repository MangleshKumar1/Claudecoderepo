import Link from "next/link";

export default function EmptyState({ emoji = "🧭", title, text, href, action }: {
  emoji?: string; title: string; text?: string; href?: string; action?: string;
}) {
  return (
    <div className="empty">
      <span className="e" aria-hidden="true">{emoji}</span>
      <h3>{title}</h3>
      {text && <p style={{ margin: 0 }}>{text}</p>}
      {href && action && <Link className="btn" href={href} style={{ marginTop: 8 }}>{action}</Link>}
    </div>
  );
}
