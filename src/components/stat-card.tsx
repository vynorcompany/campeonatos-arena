import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./stat-card.utilities";
type StatCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  comparison?: { percent: number; label?: string };
};

export function StatCard({ label, value, caption, comparison }: StatCardProps) {
  return (
    <div className={viewStyles.stat_card}>
      <p className={viewStyles.eyebrow}>{label}</p>
      <strong>{value}</strong>
      {caption ? <span>{caption}</span> : null}
      {comparison ? <small className={cx(comparison.percent >= 0 ? viewStyles.stat_card_comparison_stat_card_comparison_up : viewStyles.stat_card_comparison_stat_card_comparison_down)}>{comparison.percent >= 0 ? "↑" : "↓"} {Math.abs(comparison.percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {comparison.label ?? "vs. período anterior"}</small> : null}
    </div>
  );
}
