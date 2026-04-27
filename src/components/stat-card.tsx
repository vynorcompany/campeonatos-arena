type StatCardProps = {
  label: string;
  value: string | number;
  caption?: string;
};

export function StatCard({ label, value, caption }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      {caption ? <span>{caption}</span> : null}
    </div>
  );
}
