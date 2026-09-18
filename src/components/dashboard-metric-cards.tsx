"use client";

import { useEffect, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { StatCard } from "@/components/stat-card";

export type DashboardMetricCard = {
  id: string;
  label: string;
  value: string | number;
  caption: string;
  comparison?: { percent: number; label?: string };
  title: string;
  description: string;
  emptyMessage: string;
  items: Array<{ id: string; title: string; subtitle?: string; value?: string; date?: string }>;
};

export function DashboardMetricCards({ cards }: { cards: DashboardMetricCard[] }) {
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
      const stored = JSON.parse(window.localStorage.getItem("arena-dashboard-metric-order-v1") ?? "[]") as string[];
      if (stored.length === cards.length && stored.every((id) => cards.some((card) => card.id === id))) setOrder(stored);
    } catch { /* mantém a ordem definida pela arena */ }
  }, [cards]);
  const orderedCards = order.map((id) => cards.find((card) => card.id === id)).filter((card): card is DashboardMetricCard => Boolean(card));
  function moveCard(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setOrder((current) => {
      const next = [...current]; const from = next.indexOf(draggedId); const to = next.indexOf(targetId);
      next.splice(from, 1); next.splice(to, 0, draggedId);
      try { window.localStorage.setItem("arena-dashboard-metric-order-v1", JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      return next;
    });
    setDraggedId(null);
  }
  const active = cards.find((card) => card.id === activeId) ?? null;
  const modal = active ? <div className="dashboard-metric-modal-backdrop" role="presentation" onMouseDown={() => setActiveId(null)}>
    <section className="dashboard-metric-modal" role="dialog" aria-modal="true" aria-labelledby={`dashboard-metric-${active.id}`} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">DETALHAMENTO DO INDICADOR</p><h2 id={`dashboard-metric-${active.id}`}>{active.title}</h2><p>{active.description}</p></div><button type="button" className="button button-small" onClick={() => setActiveId(null)}>Fechar</button></header>
      {active.items.length ? <div className="dashboard-metric-list">{active.items.map((item) => <article key={item.id}><span className="dashboard-metric-list-icon" aria-hidden="true">{item.title.slice(0, 1).toUpperCase()}</span><div><strong>{item.title}</strong>{item.subtitle ? <small>{item.subtitle}</small> : null}</div>{item.value ? <b>{item.value}</b> : null}{item.date ? <time dateTime={item.date}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.date))}</time> : null}</article>)}</div> : <p className="dashboard-metric-empty">{active.emptyMessage}</p>}
    </section>
  </div> : null;
  return <>{orderedCards.map((card) => <button type="button" draggable className={`dashboard-stat-trigger${draggedId === card.id ? " is-dragging" : ""}`} key={card.id} onDragStart={(event: DragEvent<HTMLButtonElement>) => { setDraggedId(card.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={() => moveCard(card.id)} onDragEnd={() => setDraggedId(null)} onClick={() => setActiveId(card.id)} aria-haspopup="dialog" aria-label={`Ver detalhes de ${card.label}. Arraste para reordenar.`}><StatCard label={card.label} value={card.value} caption={card.caption} comparison={card.comparison} /><span className="dashboard-stat-trigger-hint">Ver detalhes · arraste para ordenar</span></button>)}{mounted && modal ? createPortal(modal, document.body) : null}</>;
}
