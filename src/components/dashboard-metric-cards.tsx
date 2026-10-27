"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./dashboard-metric-cards.utilities";

import { useEffect, useState } from "react";
import { DashboardSortablePanels } from "./dashboard-sortable-panels";
import { DashboardDetailModal } from "@/components/dashboard-detail-modal";
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
  items: Array<{ id: string; title: string; subtitle?: string; value?: string; date?: string }>;
};

export function DashboardMetricCards({ cards, storageScope = "default" }: { cards: DashboardMetricCard[]; storageScope?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveId(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  const active = cards.find((card) => card.id === activeId) ?? null;
  return <><DashboardSortablePanels metrics storageScope={storageScope}>{cards.map(card => <button type="button" className={cx(viewStyles.dashboard_stat_trigger, "tw:relative")} key={card.id} onClick={() => setActiveId(card.id)} aria-haspopup="dialog" aria-label={`Ver detalhes de ${card.label}`}><StatCard label={card.label} value={card.value} caption={card.caption} comparison={card.comparison} secondary={card.secondary} tone={card.tone} /><span className="tw:absolute tw:right-3 tw:top-3 tw:text-xs tw:text-slate-400" aria-hidden="true">↗</span></button>)}</DashboardSortablePanels>{mounted && active ? <DashboardDetailModal title={active.title} description={active.description} summary={`${active.value}${active.secondary ? ` · ${active.secondary}` : ""}`} items={active.items} emptyMessage={active.emptyMessage} onClose={() => setActiveId(null)} /> : null}</>;
}
