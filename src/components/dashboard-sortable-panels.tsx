"use client";

import { Children, type DragEvent, type ReactNode, useEffect, useRef, useState } from "react";

const storageKey = "arena-dashboard-panel-order-v1";

export function DashboardSortablePanels({ children }: { children: ReactNode }) {
  const initialPanels = useRef(Children.toArray(children));
  const defaultOrder = initialPanels.current.map((_, index) => String(index));
  const [order, setOrder] = useState(defaultOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      if (stored.length === defaultOrder.length && stored.every((id) => defaultOrder.includes(id))) setOrder(stored);
    } catch { /* A ordem padrão continua disponível se o navegador não puder ler o armazenamento. */ }
  }, [defaultOrder.length]);

  function move(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggedId);
      const to = next.indexOf(targetId);
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* sem persistência local */ }
      return next;
    });
    setDraggedId(null);
  }

  return <div className="dashboard-grid dashboard-chart-grid dashboard-sortable-grid" aria-label="Painéis reordenáveis do dashboard">
    {order.map((id) => <div key={id} className={`dashboard-sortable-panel${draggedId === id ? " is-dragging" : ""}`} draggable onDragStart={(event: DragEvent<HTMLDivElement>) => { setDraggedId(id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)} onDragEnd={() => setDraggedId(null)}>
      <span className="dashboard-drag-handle" aria-hidden="true" title="Arraste para reordenar">⠿</span>
      {initialPanels.current[Number(id)]}
    </div>)}
  </div>;
}
