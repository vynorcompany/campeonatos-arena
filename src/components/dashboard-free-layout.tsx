"use client";

import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/ui/classes";
import { elementVisualScale } from "@/lib/ui/element-visual-scale";
import { DASHBOARD_WIDTH, defaultDashboardLayout, readDashboardLayout, resizeDashboardRect, settleDashboardLayout, type DashboardEdge, type DashboardLayout, type DashboardPanelDefinition } from "@/lib/ui/dashboard-layout";
import { useDashboardLayout } from "./dashboard-workspace";

type Panel = DashboardPanelDefinition & { title: string; content: ReactNode };
const edgeStyles: Record<DashboardEdge, string> = {
  n: "tw:top-0 tw:left-3 tw:right-3 tw:h-2 tw:cursor-n-resize",
  s: "tw:bottom-0 tw:left-3 tw:right-3 tw:h-2 tw:cursor-s-resize",
  e: "tw:right-0 tw:top-3 tw:bottom-3 tw:w-2 tw:cursor-e-resize",
  w: "tw:left-0 tw:top-3 tw:bottom-3 tw:w-2 tw:cursor-w-resize",
  ne: "tw:right-0 tw:top-0 tw:size-3 tw:cursor-ne-resize",
  se: "tw:right-0 tw:bottom-0 tw:size-3 tw:cursor-se-resize",
  sw: "tw:left-0 tw:bottom-0 tw:size-3 tw:cursor-sw-resize",
  nw: "tw:left-0 tw:top-0 tw:size-3 tw:cursor-nw-resize",
};
const edgeNames: Record<DashboardEdge, string> = { n: "superior", ne: "superior direito", e: "direito", se: "inferior direito", s: "inferior", sw: "inferior esquerdo", w: "esquerdo", nw: "superior esquerdo" };

export function DashboardFreeLayout({ panels, storageScope }: { panels: Panel[]; storageScope: string }) {
  const { resetVersion } = useDashboardLayout();
  const storageKey = `arena-dashboard-free-layout-v1:${storageScope}`;
  const container = useRef<HTMLDivElement>(null);
  const contents = useRef(new Map<string, HTMLDivElement>());
  const naturalHeights = useRef<Record<string, number>>({});
  const cleanupGesture = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const activePanel = useRef<string | null>(null);
  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<DashboardLayout>({});
  const layoutRef = useRef(layout);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const lastReset = useRef(resetVersion);
  const signature = JSON.stringify(panels.map(({ id, kind }) => ({ id, kind })));
  const definitions = useMemo<DashboardPanelDefinition[]>(() => JSON.parse(signature), [signature]);
  // A stacked layout keeps the narrow viewport scrollable and preserves the desktop arrangement.
  const free = width >= 620;
  const minimumWidth = (id: string) => Math.min(DASHBOARD_WIDTH, (definitions.find(panel => panel.id === id)?.kind === "metric" ? 220 : 280) * DASHBOARD_WIDTH / Math.max(1, width));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element); setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => cleanupGesture.current?.(), []);
  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => {
    cleanupGesture.current?.();
    if (!free) return;
    const defaults = defaultDashboardLayout(definitions, width);
    const minWidths = Object.fromEntries(definitions.map(panel => [panel.id, Math.min(DASHBOARD_WIDTH, (panel.kind === "metric" ? 220 : 280) * DASHBOARD_WIDTH / width)]));
    let next = defaults;
    try { next = readDashboardLayout(JSON.parse(localStorage.getItem(storageKey) ?? "null"), defaults, minWidths); } catch { /* Layout padrão disponível sem armazenamento. */ }
    layoutRef.current = next; setLayout(next);
  }, [definitions, storageKey, width, free]);
  useEffect(() => {
    if (lastReset.current === resetVersion) return;
    lastReset.current = resetVersion; cleanupGesture.current?.();
    naturalHeights.current = {};
    try { localStorage.removeItem(storageKey); } catch { /* armazenamento indisponível */ }
    const next = defaultDashboardLayout(definitions, width);
    layoutRef.current = next; setLayout(next); setAnnouncement("Organização padrão restaurada.");
  }, [resetVersion, definitions, storageKey, width]);
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.dashboardContent;
        if (id) naturalHeights.current[id] = (entry.target as HTMLElement).offsetHeight + 2;
      }
      if (!free) return;
      setLayout(current => {
        let changed = false;
        const next = Object.fromEntries(Object.entries(current).map(([id, rect]) => {
          const height = Math.max(rect.height, naturalHeights.current[id] ?? 0);
          if (height !== rect.height) changed = true;
          return [id, { ...rect, height }];
        }));
        if (!changed) return current;
        const settled = settleDashboardLayout(next, activePanel.current ?? undefined); layoutRef.current = settled; return settled;
      });
    });
    contents.current.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [definitions, free]);

  // Read unscaled DOM sizes before painting a resize or reset (the app uses CSS zoom).
  useLayoutEffect(() => {
    if (!free) return;
    let changed = false;
    const next = Object.fromEntries(Object.entries(layout).map(([id, rect]) => {
      const measured = contents.current.get(id)?.offsetHeight;
      if (measured) naturalHeights.current[id] = measured + 2;
      const height = Math.max(rect.height, measured ? measured + 2 : 0);
      if (height !== rect.height) changed = true;
      return [id, { ...rect, height }];
    }));
    if (changed) {
      const settled = settleDashboardLayout(next, activePanel.current ?? undefined);
      layoutRef.current = settled; setLayout(settled);
    }
  }, [layout, free]);

  function apply(next: DashboardLayout, persist = false) {
    layoutRef.current = next; setLayout(next);
    if (persist) try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Mantém a organização nesta sessão. */ }
  }
  function startGesture(event: PointerEvent<HTMLElement>, id: string, edge?: DashboardEdge) {
    if (!free || event.button !== 0 || !layoutRef.current[id]) return;
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target)) return;
    if (!edge && target.closest("input,select,textarea,a,summary,details,[contenteditable=true],[data-dashboard-no-drag]")) return;
    if (event.pointerType === "touch" && !edge && !target.closest("header,.eyebrow")) return;
    cleanupGesture.current?.();
    const element = event.currentTarget, pointerId = event.pointerId;
    const initial = structuredClone(layoutRef.current), rect = initial[id];
    const start = { x: event.clientX, y: event.clientY, scroll: window.scrollY };
    const scale = elementVisualScale(container.current!);
    let moved = false, pointerX = start.x, pointerY = start.y, frame = 0, finished = false;
    function update() {
      const dx = (pointerX - start.x) / scale * DASHBOARD_WIDTH / width;
      const dy = (pointerY - start.y + window.scrollY - start.scroll) / scale;
      if (!moved && Math.hypot(pointerX - start.x, pointerY - start.y) < 5) return;
      if (!moved) element.setPointerCapture(pointerId);
      moved = true; suppressClick.current = true; activePanel.current = id; setActiveId(id);
      const minimumHeight = Math.max(definitions.find(panel => panel.id === id)?.kind === "metric" ? 110 : 180, naturalHeights.current[id] ?? 0);
      const nextRect = edge ? resizeDashboardRect(rect, edge, dx, dy, minimumWidth(id), minimumHeight) : { ...rect, x: Math.max(0, Math.min(DASHBOARD_WIDTH - rect.width, rect.x + dx)), y: Math.max(0, rect.y + dy) };
      apply(settleDashboardLayout({ ...initial, [id]: nextRect }, id));
    }
    const move = (next: globalThis.PointerEvent) => { if (next.pointerId !== pointerId) return; pointerX = next.clientX; pointerY = next.clientY; update(); };
    const autoScroll = () => {
      if (moved) {
        const previousScroll = window.scrollY;
        if (pointerY < 65) window.scrollBy(0, -10);
        else if (pointerY > innerHeight - 65) window.scrollBy(0, 10);
        if (window.scrollY !== previousScroll) update();
      }
      frame = requestAnimationFrame(autoScroll);
    };
    const cleanup = () => {
      if (finished) return; finished = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", escape);
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      cleanupGesture.current = null; activePanel.current = null; setActiveId(null);
      // The synthetic click following pointerup must not open the details dialog.
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    };
    const end = (next: globalThis.PointerEvent) => { if (next.pointerId !== pointerId) return; move(next); if (moved) { apply(layoutRef.current, true); setAnnouncement(`${edge ? "Tamanho" : "Posição"} de ${panels.find(panel => panel.id === id)?.title} salvo.`); } cleanup(); };
    const cancel = (next: globalThis.PointerEvent) => { if (next.pointerId !== pointerId) return; apply(initial); cleanup(); };
    const escape = (next: globalThis.KeyboardEvent) => { if (next.key === "Escape") { apply(initial); cleanup(); } };
    cleanupGesture.current = () => { apply(initial); cleanup(); };
    frame = requestAnimationFrame(autoScroll);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", escape);
  }
  function keyboard(event: KeyboardEvent<HTMLElement>, id: string, edge?: DashboardEdge) {
    if (!free || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) || (!edge && event.target !== event.currentTarget)) return;
    event.preventDefault(); event.stopPropagation();
    const rect = layoutRef.current[id]; if (!rect) return;
    const dx = event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0;
    const dy = event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0;
    const next = edge || event.shiftKey ? resizeDashboardRect(rect, edge ?? "se", dx, dy, minimumWidth(id), Math.max(110, naturalHeights.current[id] ?? 0)) : { ...rect, x: Math.max(0, Math.min(DASHBOARD_WIDTH - rect.width, rect.x + dx)), y: Math.max(0, rect.y + dy) };
    apply(settleDashboardLayout({ ...layoutRef.current, [id]: next }, id), true);
  }
  const height = Math.max(0, ...Object.values(layout).map(rect => rect.y + rect.height));
  return <div ref={container} className={cx("dashboard-free-layout tw:relative tw:min-w-0", !free && "tw:grid tw:gap-3")} style={free ? { height } : undefined} aria-label="Dashboard com organização livre" onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
    {panels.map(panel => {
      const rect = layout[panel.id];
      return <article key={panel.id} data-dashboard-panel={panel.id} tabIndex={free ? 0 : undefined} aria-label={panel.title} aria-describedby={free ? "dashboard-layout-instructions" : undefined} onKeyDown={event => keyboard(event, panel.id)} onPointerDownCapture={event => { if (!(event.target as HTMLElement).closest("[data-resize-edge]")) startGesture(event, panel.id); }} className={cx("dashboard-free-panel tw:group tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-[var(--line)] tw:bg-white tw:shadow-[var(--shadow)] tw:focus-visible:outline-2 tw:focus-visible:outline-blue-600", free && "tw:absolute tw:cursor-grab tw:select-none tw:hover:border-blue-400", activeId === panel.id && "tw:z-20 tw:cursor-grabbing tw:ring-2 tw:ring-blue-500")} style={free && rect ? { left: `${rect.x / DASHBOARD_WIDTH * 100}%`, top: rect.y, width: `${rect.width / DASHBOARD_WIDTH * 100}%`, height: rect.height } : free ? { visibility: "hidden" } : undefined}>
        <div ref={element => { if (element) contents.current.set(panel.id, element); else contents.current.delete(panel.id); }} data-dashboard-content={panel.id} className="dashboard-free-content tw:min-w-0 tw:[&>.card]:h-auto! tw:[&>.card]:border-0! tw:[&>.card]:shadow-none! tw:[&>.dashboard-stat-trigger]:w-full tw:[&>.dashboard-stat-trigger]:border-0! tw:[&>.dashboard-stat-trigger]:shadow-none! tw:[&_header]:touch-none tw:[&_.eyebrow]:touch-none">{panel.content}</div>
        {free ? (Object.keys(edgeStyles) as DashboardEdge[]).map(edge => <button key={edge} type="button" data-resize-edge={edge} aria-label={`Redimensionar ${panel.title}: ${edgeNames[edge]}`} title={`Arraste o extremo ${edgeNames[edge]}`} className={cx("tw:absolute tw:z-10 tw:touch-none tw:rounded-sm tw:border-0 tw:bg-transparent tw:p-0 tw:hover:bg-blue-500/20 tw:focus-visible:bg-blue-500/20 tw:focus-visible:outline-2 tw:focus-visible:outline-blue-600", edgeStyles[edge])} onPointerDown={event => { event.stopPropagation(); startGesture(event, panel.id, edge); }} onKeyDown={event => keyboard(event, panel.id, edge)} />) : null}
      </article>;
    })}
    <p id="dashboard-layout-instructions" className="tw:sr-only">Arraste o cartão para mover. Arraste qualquer borda ou canto para redimensionar. Pelo teclado, use as setas para mover e Shift mais setas para redimensionar. Escape cancela o ajuste.</p>
    <span className="tw:sr-only" role="status">{announcement}</span>
  </div>;
}
