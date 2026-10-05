"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./dashboard-sortable-panels.utilities";

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
  const grid = useRef<HTMLDivElement>(null);
  const resizeCleanup = useRef<(() => void) | null>(null);
  const [gridColumns, setGridColumns] = useState(1);
  useEffect(() => () => resizeCleanup.current?.(), []);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () => setGridColumns(Math.max(1, window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
      if (stored.length === defaultOrder.length && new Set(stored).size === stored.length && stored.every((id) => defaultOrder.includes(id))) setOrder(stored);
    } catch { /* A ordem padrão continua disponível se o navegador não puder ler o armazenamento. */ }
  }, [defaultOrder.length]);
  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(layoutStorageKey) ?? "{}") as Record<string, PanelLayout>;
      setLayouts(Object.fromEntries(Object.entries(stored).filter(([id, layout]) => defaultOrder.includes(id) && Number.isFinite(layout?.columns) && Number.isFinite(layout?.minHeight)).map(([id, layout]) => [id, { columns: Math.max(1, Math.min(3, Math.round(layout.columns))), minHeight: Math.max(0, Math.min(880, layout.minHeight)) }])));
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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeCleanup.current?.();
    const handle = event.currentTarget;
    const panel = event.currentTarget.parentElement;
    const grid = panel?.parentElement;
    if (!panel || !grid) return;
    const panelRect = panel.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    const gridStyle = window.getComputedStyle(grid);
    const columns = Math.max(1, gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length);
    if (axis === "horizontal" && columns === 1) return;
    handle.setPointerCapture(event.pointerId);
    const initial = { columns: Math.min(columns, layouts[id]?.columns ?? 1), minHeight: layouts[id]?.minHeight ?? Math.round(panelRect.height) };
    const gap = Number.parseFloat(gridStyle.columnGap) || 0;
    const columnWidth = Math.max(1, (gridRect.width - gap * (columns - 1)) / columns);
    let next = initial;
    const pointerId = event.pointerId;
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      next = axis === "horizontal"
        ? { ...initial, columns: Math.max(1, Math.min(columns, Math.round((panelRect.width + moveEvent.clientX - start.x + gap) / (columnWidth + gap)))) }
        : { ...initial, minHeight: Math.max(160, Math.min(880, Math.round(panelRect.height + moveEvent.clientY - start.y))) };
      setLayouts(current => ({ ...current, [id]: next }));
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      resizeCleanup.current = null;
    };
    const end = (endEvent: globalThis.PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      move(endEvent);
      cleanup();
      persistLayout(id, next);
    };
    const cancel = (cancelEvent: globalThis.PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cleanup();
      persistLayout(id, next);
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel);
  }

  return <div ref={grid} className={viewStyles.dashboard_grid_dashboard_chart_grid_dashboard_sortable_grid} aria-label="Painéis reordenáveis do dashboard">
    {order.map((id) => <div key={id} className={cx(`${viewStyles.dashboard_sortable_panel}${draggedId === id ? " is-dragging" : ""}`)} style={{ gridColumn: `span ${Math.max(1, Math.min(gridColumns, layouts[id]?.columns ?? 1))}`, minHeight: layouts[id]?.minHeight }} onDragOver={(event) => event.preventDefault()} onDrop={() => move(id)}>
      <span className={viewStyles.dashboard_drag_handle} draggable onDragStart={(event: DragEvent<HTMLSpanElement>) => { setDraggedId(id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDraggedId(null)} aria-label="Arraste para reordenar" title="Arraste para reordenar">⠿</span>
      {layouts[id] ? <button type="button" className="tw:absolute tw:top-2 tw:right-9 tw:z-10 tw:grid tw:size-6 tw:place-items-center tw:rounded tw:border-0 tw:bg-transparent tw:text-[var(--muted)] tw:hover:bg-[var(--panel-muted)]" aria-label="Restaurar tamanho do card" title="Restaurar tamanho do card" onClick={() => { resizeCleanup.current?.(); setLayouts(current => { const next = { ...current }; delete next[id]; try { window.localStorage.setItem(layoutStorageKey, JSON.stringify(next)); } catch { /* sem persistência local */ } return next; }); }}>↺</button> : null}
      {gridColumns > 1 ? <span className={viewStyles.dashboard_panel_resize_handle_dashboard_panel_resize_handle_right} role="separator" tabIndex={0} aria-orientation="vertical" aria-valuemin={1} aria-valuemax={gridColumns} aria-valuenow={Math.min(gridColumns, layouts[id]?.columns ?? 1)} aria-label="Arraste para alterar a largura" onPointerDown={(event) => startResize(event, id, "horizontal")} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); const panel = event.currentTarget.parentElement!; persistLayout(id, { columns: Math.max(1, Math.min(gridColumns, (layouts[id]?.columns ?? 1) + (event.key === "ArrowRight" ? 1 : -1))), minHeight: layouts[id]?.minHeight ?? Math.round(panel.getBoundingClientRect().height) }); }} /> : null}
      <span className={viewStyles.dashboard_panel_resize_handle_dashboard_panel_resize_handle_bottom} role="separator" tabIndex={0} aria-orientation="horizontal" aria-valuemin={160} aria-valuemax={880} aria-valuenow={layouts[id]?.minHeight ?? 160} aria-label="Arraste para alterar a altura" onPointerDown={(event) => startResize(event, id, "vertical")} onKeyDown={event => { if (!["ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); const panel = event.currentTarget.parentElement!; persistLayout(id, { columns: Math.min(gridColumns, layouts[id]?.columns ?? 1), minHeight: Math.max(160, Math.min(880, Math.round(panel.getBoundingClientRect().height) + (event.key === "ArrowDown" ? 20 : -20))) }); }} />
      {initialPanels.current[Number(id)]}
    </div>)}
  </div>;
}
