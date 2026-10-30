export function CardSkeletons({ n = 6 }: { n?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton sk-card" />)}
    </div>
  );
}
