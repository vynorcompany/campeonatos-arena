/** Horizontal coordinates use a 1200-unit canvas; vertical coordinates remain CSS pixels. */
export const DASHBOARD_WIDTH = 1200;
export const DASHBOARD_GAP = 12;
export type DashboardRect = { x: number; y: number; width: number; height: number };
export type DashboardLayout = Record<string, DashboardRect>;
export type DashboardPanelKind = "metric" | "chart" | "flow";
export type DashboardPanelDefinition = { id: string; kind: DashboardPanelKind };
export type DashboardEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export function rectanglesOverlap(a: DashboardRect, b: DashboardRect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Keep the manipulated card at the pointer and move intersecting neighbours below it. */
export function settleDashboardLayout(layout: DashboardLayout, activeId?: string): DashboardLayout {
  const next = Object.fromEntries(Object.entries(layout).map(([id, rect]) => [id, { ...rect }]));
  const placed: DashboardRect[] = activeId && next[activeId] ? [next[activeId]] : [];
  const others = Object.keys(next).filter(id => id !== activeId).sort((a, b) => next[a].y - next[b].y || next[a].x - next[b].x);
  for (const id of others) {
    const rect = next[id];
    for (let attempt = 0; attempt <= placed.length; attempt++) {
      const collisions = placed.filter(other => rectanglesOverlap({ ...rect, height: rect.height + DASHBOARD_GAP }, { ...other, height: other.height + DASHBOARD_GAP }));
      if (!collisions.length) break;
      rect.y = Math.max(...collisions.map(other => other.y + other.height + DASHBOARD_GAP));
    }
    placed.push(rect);
  }
  return next;
}

export function defaultDashboardLayout(panels: DashboardPanelDefinition[], containerWidth: number): DashboardLayout {
  const layout: DashboardLayout = {};
  const scale = Math.max(1, containerWidth) / DASHBOARD_WIDTH;
  const gap = DASHBOARD_GAP / scale;
  let y = 0, column = 0, rowHeight = 0, previousKind: DashboardPanelKind | undefined;
  for (const panel of panels) {
    const columns = panel.kind === "flow" ? 1 : panel.kind === "metric" ? containerWidth >= 1050 ? 4 : containerWidth >= 780 ? 3 : 2 : containerWidth >= 1000 ? 3 : 2;
    if (previousKind && panel.kind !== previousKind && column) { y += rowHeight + DASHBOARD_GAP; column = 0; rowHeight = 0; }
    const width = (DASHBOARD_WIDTH - gap * (columns - 1)) / columns;
    const height = panel.kind === "metric" ? 132 : panel.kind === "flow" ? 300 : 360;
    layout[panel.id] = { x: column * (width + gap), y, width, height };
    rowHeight = Math.max(rowHeight, height);
    column++;
    if (column === columns) { y += rowHeight + DASHBOARD_GAP; column = 0; rowHeight = 0; }
    previousKind = panel.kind;
  }
  return layout;
}

export function resizeDashboardRect(rect: DashboardRect, edge: DashboardEdge, dx: number, dy: number, minWidth: number, minHeight: number): DashboardRect {
  let { x, y, width, height } = rect;
  if (edge.includes("w")) { x = Math.max(0, Math.min(rect.x + dx, rect.x + rect.width - minWidth)); width = rect.x + rect.width - x; }
  if (edge.includes("e")) width = Math.max(minWidth, Math.min(DASHBOARD_WIDTH - x, rect.width + dx));
  if (edge.includes("n")) { y = Math.max(0, Math.min(rect.y + dy, rect.y + rect.height - minHeight)); height = rect.y + rect.height - y; }
  if (edge.includes("s")) height = Math.max(minHeight, rect.height + dy);
  return { x, y, width, height };
}

export function readDashboardLayout(value: unknown, defaults: DashboardLayout, minWidths: Record<string, number>): DashboardLayout {
  const next = { ...defaults };
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;
  for (const [id, rect] of Object.entries(value)) {
    if (!Object.hasOwn(defaults, id) || !rect || typeof rect !== "object") continue;
    const candidate = rect as DashboardRect;
    if (![candidate.x, candidate.y, candidate.width, candidate.height].every(Number.isFinite)) continue;
    const width = Math.max(minWidths[id], Math.min(DASHBOARD_WIDTH, candidate.width));
    next[id] = { x: Math.max(0, Math.min(DASHBOARD_WIDTH - width, candidate.x)), y: Math.max(0, Math.min(50000, candidate.y)), width, height: Math.max(80, Math.min(2000, candidate.height)) };
  }
  return settleDashboardLayout(next);
}
