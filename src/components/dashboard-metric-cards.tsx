"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./dashboard-metric-cards.utilities";

import { useEffect, useState, type DragEvent } from "react";
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
  const storageKey = `arena-dashboard-metric-order-v2:${storageScope}`;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [order, setOrder] = useState(() => cards.map((card) => card.id));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveId(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      if (stored.length === cards.length && new Set(stored).size === stored.length && stored.every((id) => cards.some((card) => card.id === id))) setOrder(stored);
    } catch { /* mantém a ordem definida pela arena */ }
  }, [cards, storageKey]);
  const orderedCards = order.map((id) => cards.find((card) => card.id === id)).filter((card): card is DashboardMetricCard => Boolean(card));
  function moveCard(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setOrder((current) => {
      const next = [...current]; const from = next.indexOf(draggedId); const to = next.indexOf(targetId);
      next.splice(from, 1); next.splice(to, 0, draggedId);
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      return next;
    });
    setDraggedId(null);
  }
  const active = cards.find((card) => card.id === activeId) ?? null;
  return <>{orderedCards.map((card) => <button type="button" draggable className={cx(`${viewStyles.dashboard_stat_trigger} tw:relative${draggedId === card.id ? " is-dragging" : ""}`)} key={card.id} onDragStart={(event: DragEvent<HTMLButtonElement>) => { setDraggedId(card.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={() => moveCard(card.id)} onDragEnd={() => setDraggedId(null)} onClick={() => setActiveId(card.id)} aria-haspopup="dialog" aria-label={`Ver detalhes de ${card.label}. Arraste para reordenar.`}><StatCard label={card.label} value={card.value} caption={card.caption} comparison={card.comparison} secondary={card.secondary} tone={card.tone} /><span className="tw:absolute tw:right-3 tw:top-3 tw:text-xs tw:text-slate-400" aria-hidden="true">↗</span></button>)}{mounted && active ? <DashboardDetailModal title={active.title} description={active.description} summary={`${active.value}${active.secondary ? ` · ${active.secondary}` : ""}`} items={active.items} emptyMessage={active.emptyMessage} onClose={() => setActiveId(null)} /> : null}</>;
}
