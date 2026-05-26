type MetricCardProps = {
  label: string;
  value: string | number;
  caption?: string;
};

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? <small>{caption}</small> : null}
    </article>
  );
}

