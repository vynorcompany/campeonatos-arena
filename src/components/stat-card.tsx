type StatCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  comparison?: { percent: number; label?: string };
};

export function StatCard({ label, value, caption, comparison }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      {caption ? <span>{caption}</span> : null}
      {comparison ? <small className={comparison.percent >= 0 ? "stat-card-comparison stat-card-comparison-up" : "stat-card-comparison stat-card-comparison-down"}>{comparison.percent >= 0 ? "↑" : "↓"} {Math.abs(comparison.percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {comparison.label ?? "vs. período anterior"}</small> : null}
    </div>
  );
}
