"use client";

import { Children, type DragEvent, type ReactNode, useEffect, useRef, useState } from "react";

const storageKey = "arena-dashboard-panel-order-v1";
const sizeStorageKey = "arena-dashboard-panel-size-v1";
type PanelSize = "compact" | "normal" | "wide";

export function DashboardSortablePanels({ children }: { children: ReactNode }) {
  const initialPanels = useRef(Children.toArray(children));
  const defaultOrder = initialPanels.current.map((_, index) => String(index));
  const [order, setOrder] = useState(defaultOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, PanelSize>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      if (stored.length === defaultOrder.length && stored.every((id) => defaultOrder.includes(id))) setOrder(stored);
    } catch { /* A ordem padrão continua disponível se o navegador não puder ler o armazenamento. */ }
  }, [defaultOrder.length]);
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(sizeStorageKey) ?? "{}") as Record<string, PanelSize>;
      setSizes(Object.fromEntries(Object.entries(stored).filter(([id, size]) => defaultOrder.includes(id) && ["compact", "normal", "wide"].includes(size))));
    } catch { /* mantém o tamanho normal */ }
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

  function resize(id: string, direction: -1 | 1) {
    const options: PanelSize[] = ["compact", "normal", "wide"];
    setSizes((current) => {
      const currentSize = current[id] ?? "normal";
      const nextSize = options[Math.max(0, Math.min(options.length - 1, options.indexOf(currentSize) + direction))];
      const next = { ...current, [id]: nextSize };
      try { window.localStorage.setItem(sizeStorageKey, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      return next;
    });
  }

  return <div className="dashboard-grid dashboard-chart-grid dashboard-sortable-grid" aria-label="Painéis reordenáveis do dashboard">
    {order.map((id) => <div key={id} className={`dashboard-sortable-panel dashboard-panel-${sizes[id] ?? "normal"}${draggedId === id ? " is-dragging" : ""}`} draggable onDragStart={(event: DragEvent<HTMLDivElement>) => { setDraggedId(id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)} onDragEnd={() => setDraggedId(null)}>
      <span className="dashboard-drag-handle" aria-hidden="true" title="Arraste para reordenar">⠿</span>
      <span className="dashboard-panel-resize" onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => resize(id, -1)} aria-label="Diminuir cartão" title="Diminuir cartão">−</button><button type="button" onClick={() => resize(id, 1)} aria-label="Aumentar cartão" title="Aumentar cartão">+</button></span>
      {initialPanels.current[Number(id)]}
    </div>)}
  </div>;
}
