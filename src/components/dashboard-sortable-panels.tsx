"use client";

import { Children, type DragEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";

const storageKey = "arena-dashboard-panel-order-v1";
// Uma versão nova evita reaproveitar dimensões experimentais gravadas pela
// primeira implementação do redimensionamento.
const layoutStorageKey = "arena-dashboard-panel-layout-v3";
type PanelLayout = { columns: number; minHeight: number };

export function DashboardSortablePanels({ children }: { children: ReactNode }) {
  const initialPanels = useRef(Children.toArray(children));
  const defaultOrder = initialPanels.current.map((_, index) => String(index));
  const [order, setOrder] = useState(defaultOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<Record<string, PanelLayout>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      if (stored.length === defaultOrder.length && stored.every((id) => defaultOrder.includes(id))) setOrder(stored);
    } catch { /* A ordem padrão continua disponível se o navegador não puder ler o armazenamento. */ }
  }, [defaultOrder.length]);
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(layoutStorageKey) ?? "{}") as Record<string, PanelLayout>;
      setLayouts(Object.fromEntries(Object.entries(stored).filter(([id, layout]) => defaultOrder.includes(id) && Number.isFinite(layout?.columns) && Number.isFinite(layout?.minHeight))));
    } catch { /* mantém o tamanho padrão */ }
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

  function persistLayout(id: string, layout: PanelLayout) {
    setLayouts((current) => {
      const next = { ...current, [id]: layout };
      try { window.localStorage.setItem(layoutStorageKey, JSON.stringify(next)); } catch { /* sem persistência local */ }
      return next;
    });
  }

  function startResize(event: PointerEvent<HTMLSpanElement>, id: string, axis: "horizontal" | "vertical") {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const panel = event.currentTarget.parentElement;
    const grid = panel?.parentElement;
    if (!panel || !grid) return;
    const panelRect = panel.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    const initial = layouts[id] ?? { columns: 1, minHeight: Math.round(panelRect.height) };
    const gridStyle = window.getComputedStyle(grid);
    const columns = Math.max(1, gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length);
    const gap = Number.parseFloat(gridStyle.columnGap) || 0;
    const columnWidth = Math.max(1, (gridRect.width - gap * (columns - 1)) / columns);
    const move = (moveEvent: globalThis.PointerEvent) => {
      const next = axis === "horizontal"
        ? { ...initial, columns: Math.max(1, Math.min(columns, Math.round((panelRect.width + moveEvent.clientX - start.x + gap) / (columnWidth + gap)))) }
        : { ...initial, minHeight: Math.max(160, Math.min(880, Math.round(panelRect.height + moveEvent.clientY - start.y))) };
      persistLayout(id, next);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  }

  return <div className="dashboard-grid dashboard-chart-grid dashboard-sortable-grid" aria-label="Painéis reordenáveis do dashboard">
    {order.map((id) => <div key={id} className={`dashboard-sortable-panel${draggedId === id ? " is-dragging" : ""}`} style={{ gridColumn: `span ${layouts[id]?.columns ?? 1}`, minHeight: layouts[id]?.minHeight }} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)}>
      <span className="dashboard-drag-handle" draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { setDraggedId(id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDraggedId(null)} aria-label="Arraste para reordenar" title="Arraste para reordenar">⠿</span>
      <span className="dashboard-panel-resize-handle dashboard-panel-resize-handle-right" role="separator" aria-orientation="vertical" aria-label="Arraste para alterar a largura" onPointerDown={(event) => startResize(event, id, "horizontal")} />
      <span className="dashboard-panel-resize-handle dashboard-panel-resize-handle-bottom" role="separator" aria-orientation="horizontal" aria-label="Arraste para alterar a altura" onPointerDown={(event) => startResize(event, id, "vertical")} />
      {initialPanels.current[Number(id)]}
    </div>)}
  </div>;
}
