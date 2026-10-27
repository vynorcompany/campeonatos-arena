import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./stat-card.utilities";
type StatCardProps = {
  label: string;
  value: string | number;
  caption?: string;
  secondary?: string;
  tone?: "positive" | "negative" | "neutral";
  comparison?: { percent: number; label?: string; favorable?: "up" | "down" };
};

export function StatCard({ label, value, caption, comparison, secondary, tone }: StatCardProps) {
  return (
    <div className={viewStyles.stat_card}>
      <p className={viewStyles.eyebrow}>{label}</p>
      <strong className={tone === "positive" ? "tw:text-emerald-700!" : tone === "negative" ? "tw:text-red-700!" : undefined}>{value}{secondary ? <small className="tw:ml-2 tw:inline-block tw:text-sm tw:font-semibold">{secondary}</small> : null}</strong>
      {caption ? <span>{caption}</span> : null}
      {comparison ? <small className={cx((comparison.favorable === "down" ? comparison.percent <= 0 : comparison.percent >= 0) ? viewStyles.stat_card_comparison_stat_card_comparison_up : viewStyles.stat_card_comparison_stat_card_comparison_down)}>{comparison.percent >= 0 ? "↑" : "↓"} {Math.abs(comparison.percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {comparison.label ?? "vs. período anterior"}</small> : null}
    </div>
  );
}
