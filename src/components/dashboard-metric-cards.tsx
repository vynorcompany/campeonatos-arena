"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./dashboard-metric-cards.utilities";

import { useEffect, useState } from "react";
import { DashboardDetailModal, type DashboardDetailItem } from "@/components/dashboard-detail-modal";
import { StatCard } from "@/components/stat-card";

export type DashboardMetricCard = {
  id: string;
  label: string;
  value: string | number;
  caption: string;
  secondary?: string;
  tone?: "positive" | "negative" | "neutral";
  comparison?: { percent: number; label?: string; favorable?: "up" | "down" };
  title: string;
  description: string;
  emptyMessage: string;
  items: DashboardDetailItem[];
};

export function DashboardMetricTile({ card }: { card: DashboardMetricCard }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return <><button type="button" className={cx(viewStyles.dashboard_stat_trigger, "tw:relative")} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Ver detalhes de ${card.label}`}><StatCard label={card.label} value={card.value} caption={card.caption} comparison={card.comparison} secondary={card.secondary} tone={card.tone} /><span className="tw:absolute tw:right-3 tw:top-3 tw:text-xs tw:text-slate-400" aria-hidden="true">↗</span></button>{mounted && open ? <DashboardDetailModal title={card.title} description={card.description} summary={`${card.value}${card.secondary ? ` · ${card.secondary}` : ""}`} tone={card.tone} items={card.items} emptyMessage={card.emptyMessage} onClose={() => setOpen(false)} /> : null}</>;
}
