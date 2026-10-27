"use client";

import { Children, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/ui/classes";
import { useDashboardLayout } from "./dashboard-workspace";

type PanelLayout = { columns: number; minHeight: number };
const control = "tw:inline-flex tw:min-h-8 tw:min-w-8 tw:items-center tw:justify-center tw:rounded tw:border tw:border-solid tw:border-slate-300 tw:bg-white tw:px-2 tw:text-xs tw:text-slate-700 tw:disabled:opacity-35 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-blue-700";

export function DashboardSortablePanels({ children, storageScope = "default", metrics = false }: { children: ReactNode; storageScope?: string; metrics?: boolean }) {
  const { editing, resetVersion } = useDashboardLayout();
  const storageKey = `${metrics ? "arena-dashboard-metric-order-v2" : "arena-dashboard-panel-order-v2"}:${storageScope}`;
  const layoutStorageKey = `arena-dashboard-panel-layout-v5:${storageScope}`;
  const panels = Children.toArray(children);
  const ids = panels.map((panel, index) => metrics && typeof panel === "object" && panel !== null && "key" in panel ? String(panel.key).replace(/^\.\$/, "") : String(index));
  const signature = JSON.stringify(ids);
  const defaultOrder = useMemo<string[]>(() => JSON.parse(signature), [signature]);
  const [order, setOrder] = useState(defaultOrder);
  const [layouts, setLayouts] = useState<Record<string, PanelLayout>>({});
  const [gridColumns, setGridColumns] = useState(1);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const cleanupDrag = useRef<(() => void) | null>(null);
  const lastReset = useRef(resetVersion);

  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () => setGridColumns(Math.max(1, Number(getComputedStyle(element).getPropertyValue("--dashboard-columns")) || 1));
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cleanupDrag.current?.(), []);
  useEffect(() => { if (!editing) cleanupDrag.current?.(); }, [editing]);
  useEffect(() => {
    let nextOrder = defaultOrder;
    let nextLayouts: Record<string, PanelLayout> = {};
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored)) nextOrder = [...new Set(stored.filter((id): id is string => typeof id === "string" && defaultOrder.includes(id))), ...defaultOrder.filter(id => !stored.includes(id))];
      const saved = JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}");
      nextLayouts = Object.fromEntries(Object.entries(saved ?? {}).filter(([id, value]) => defaultOrder.includes(id) && value && typeof value === "object" && "columns" in value && "minHeight" in value && Number.isFinite(value.columns) && Number.isFinite(value.minHeight)).map(([id, value]) => {
        const layout = value as PanelLayout;
        return [id, { columns: Math.max(1, Math.min(4, Math.round(layout.columns))), minHeight: Math.max(0, Math.min(880, layout.minHeight)) }];
      }));
    } catch { /* Mantém o dashboard utilizável sem armazenamento local. */ }
    setOrder(nextOrder); setLayouts(nextLayouts);
  }, [defaultOrder, storageKey, layoutStorageKey]);
  useEffect(() => {
    if (resetVersion === lastReset.current) return;
    lastReset.current = resetVersion;
    setOrder(defaultOrder); setLayouts({});
    try { localStorage.removeItem(storageKey); localStorage.removeItem(layoutStorageKey); } catch { /* armazenamento indisponível */ }
  }, [resetVersion, defaultOrder, storageKey, layoutStorageKey]);

  function move(id: string, target: string) {
    if (id === target) return;
    setOrder(current => {
      const next = [...current];
      const from = next.indexOf(id), to = next.indexOf(target);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1); next.splice(to, 0, id);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      setAnnouncement(`Cartão movido para a posição ${to + 1}.`);
      return next;
    });
  }
  function resize(id: string, change: Partial<PanelLayout>) {
    setLayouts(current => {
      const next = { ...current, [id]: { ...(current[id] ?? { columns: 1, minHeight: 0 }), ...change } };
      try { localStorage.setItem(layoutStorageKey, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
      return next;
    });
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return;
    event.preventDefault();
    cleanupDrag.current?.();
    const handle = event.currentTarget, pointerId = event.pointerId;
    let target = id;
    let pointerX = event.clientX, pointerY = event.clientY, frame = 0;
    handle.setPointerCapture(pointerId);
    setDraggedId(id);
    const update = (next: globalThis.PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      pointerX = next.clientX; pointerY = next.clientY;
      const element = document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>("[data-dashboard-panel]");
      if (element?.parentElement === grid.current && element.dataset.dashboardPanel) {
        target = element.dataset.dashboardPanel; setTargetId(target);
      }
    };
    const autoScroll = () => {
      if (pointerY < 80) window.scrollBy(0, -12);
      else if (pointerY > innerHeight - 80) window.scrollBy(0, 12);
      const element = document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>("[data-dashboard-panel]");
      if (element?.parentElement === grid.current && element.dataset.dashboardPanel) { target = element.dataset.dashboardPanel; setTargetId(target); }
      frame = requestAnimationFrame(autoScroll);
    };
    frame = requestAnimationFrame(autoScroll);
    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", update); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", escape);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      setDraggedId(null); setTargetId(null); cleanupDrag.current = null;
    };
    const end = (next: globalThis.PointerEvent) => { if (next.pointerId !== pointerId) return; update(next); cleanup(); move(id, target); };
    const cancel = (next: globalThis.PointerEvent) => { if (next.pointerId === pointerId) cleanup(); };
    const escape = (next: KeyboardEvent) => { if (next.key === "Escape") cleanup(); };
    cleanupDrag.current = cleanup;
    window.addEventListener("pointermove", update); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", escape);
  }
  return <div ref={grid} className={cx("dashboard-sortable-grid tw:grid tw:min-w-0 tw:items-stretch tw:gap-3", metrics ? "tw:[--dashboard-columns:4] tw:viewport-1120:[--dashboard-columns:3] tw:viewport-900:[--dashboard-columns:2] tw:viewport-580:[--dashboard-columns:1] tw:grid-cols-4 tw:viewport-1120:grid-cols-3 tw:viewport-900:grid-cols-2 tw:viewport-580:grid-cols-1" : "tw:[--dashboard-columns:3] tw:viewport-1180:[--dashboard-columns:2] tw:viewport-760:[--dashboard-columns:1] tw:grid-cols-3 tw:viewport-1180:grid-cols-2 tw:viewport-760:grid-cols-1")} aria-label={metrics ? "Indicadores reordenáveis" : "Gráficos reordenáveis"}>
    {order.filter(id => ids.includes(id)).map((id, index) => <div key={id} data-dashboard-panel={id} className={cx("dashboard-sortable-panel tw:flex tw:min-w-0 tw:flex-col tw:rounded-xl tw:[&>.card]:flex-1 tw:[&>.dashboard-stat-trigger]:flex-1", editing && "tw:outline tw:outline-1 tw:outline-dashed tw:outline-slate-300", draggedId === id && "tw:opacity-50", targetId === id && targetId !== draggedId && "tw:ring-2 tw:ring-blue-600")} style={{ gridColumn: `span ${Math.min(gridColumns, layouts[id]?.columns ?? 1)}`, minHeight: layouts[id]?.minHeight || undefined }}>
      {editing ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:rounded-t-xl tw:border-b tw:border-slate-200 tw:bg-slate-50 tw:p-2">
        <button type="button" className={cx(control, "tw:touch-none tw:cursor-grab tw:active:cursor-grabbing")} onPointerDown={event => startDrag(event, id)} aria-label={`Arrastar cartão ${index + 1}`} title="Arrastar para reposicionar">⠿</button>
        <button type="button" className={control} disabled={index === 0} onClick={() => move(id, order[index - 1])} aria-label={`Mover cartão ${index + 1} para antes`}>←</button>
        <button type="button" className={control} disabled={index === order.length - 1} onClick={() => move(id, order[index + 1])} aria-label={`Mover cartão ${index + 1} para depois`}>→</button>
        {gridColumns > 1 ? <label className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-slate-600">Largura<select className={control} aria-label={`Largura do cartão ${index + 1}`} value={Math.min(gridColumns, layouts[id]?.columns ?? 1)} onChange={event => resize(id, { columns: Number(event.target.value) })}>{Array.from({ length: gridColumns }, (_, column) => <option key={column} value={column + 1}>{column + 1 === gridColumns ? "Linha inteira" : `${column + 1} coluna${column ? "s" : ""}`}</option>)}</select></label> : null}
        {!metrics ? <label className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-slate-600">Altura<select className={control} aria-label={`Altura do cartão ${index + 1}`} value={layouts[id]?.minHeight ?? 0} onChange={event => resize(id, { minHeight: Number(event.target.value) })}><option value={0}>Automática</option><option value={320}>Compacta</option><option value={440}>Média</option><option value={560}>Ampla</option></select></label> : null}
      </div> : null}
      {panels[ids.indexOf(id)]}
    </div>)}
    <span className="tw:sr-only tw:absolute" role="status">{announcement}</span>
  </div>;
}
