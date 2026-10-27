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

export type DashboardGuide = { axis: "x" | "y"; position: number; start: number; end: number };

/** Snap only the manipulated rectangle; neighbours remain immutable throughout the gesture. */
export function snapDashboardRect(rect: DashboardRect, layout: DashboardLayout, id: string, toleranceX: number, toleranceY: number, gapX: number, edge?: DashboardEdge, minWidth = 0, minHeight = 0): { rect: DashboardRect; guides: DashboardGuide[] } {
  type Match = { delta: number; position: number; own: number; other: DashboardRect; priority: number; distance: number };
  let xMatch: Match | undefined, yMatch: Match | undefined;
  const ownX = edge ? edge.includes("w") ? [0] : edge.includes("e") ? [1] : [] : [0, 1, .5];
  const ownY = edge ? edge.includes("n") ? [0] : edge.includes("s") ? [1] : [] : [0, 1, .5];
  const choose = (current: Match | undefined, candidate: Match, tolerance: number) => {
    if (Math.abs(candidate.delta) > tolerance) return current;
    const score = (match: Match) => Math.abs(match.delta) / Math.max(1, tolerance) + match.distance / 160;
    return !current || score(candidate) < score(current) - .01 || Math.abs(score(candidate) - score(current)) < .01 && candidate.priority < current.priority ? candidate : current;
  };
  const neighbours = Object.entries(layout).filter(([key]) => key !== id).map(([, value]) => value);
  for (const other of neighbours) {
    const distanceX = Math.max(0, other.y - rect.y - rect.height, rect.y - other.y - other.height);
    const distanceY = Math.max(0, other.x - rect.x - rect.width, rect.x - other.x - other.width);
    for (const own of ownX) for (const target of [0, 1, .5]) {
      const position = other.x + other.width * target;
      xMatch = choose(xMatch, { delta: position - (rect.x + rect.width * own), position, own, other, priority: own === target ? 0 : 1, distance: distanceX }, toleranceX);
    }
    for (const own of ownY) for (const target of [0, 1, .5]) {
      const position = other.y + other.height * target;
      yMatch = choose(yMatch, { delta: position - (rect.y + rect.height * own), position, own, other, priority: own === target ? 0 : 1, distance: distanceY }, toleranceY);
    }
    for (const [own, position] of [[0, other.x + other.width + gapX], [1, other.x - gapX]]) if (ownX.includes(own)) xMatch = choose(xMatch, { delta: position - (rect.x + rect.width * own), position, own, other, priority: 2, distance: distanceX }, toleranceX);
    for (const [own, position] of [[0, other.y + other.height + DASHBOARD_GAP], [1, other.y - DASHBOARD_GAP]]) if (ownY.includes(own)) yMatch = choose(yMatch, { delta: position - (rect.y + rect.height * own), position, own, other, priority: 2, distance: distanceY }, toleranceY);
  }
  const snapped = edge ? resizeDashboardRect(rect, edge, xMatch?.delta ?? 0, yMatch?.delta ?? 0, minWidth, minHeight) : { ...rect, x: Math.max(0, Math.min(DASHBOARD_WIDTH - rect.width, rect.x + (xMatch?.delta ?? 0))), y: Math.max(0, rect.y + (yMatch?.delta ?? 0)) };
  const guides: DashboardGuide[] = [];
  if (xMatch && Math.abs(snapped.x + snapped.width * xMatch.own - xMatch.position) < .1) guides.push({ axis: "x", position: xMatch.position, start: Math.min(snapped.y, xMatch.other.y), end: Math.max(snapped.y + snapped.height, xMatch.other.y + xMatch.other.height) });
  if (yMatch && Math.abs(snapped.y + snapped.height * yMatch.own - yMatch.position) < .1) guides.push({ axis: "y", position: yMatch.position, start: Math.min(snapped.x, yMatch.other.x), end: Math.max(snapped.x + snapped.width, yMatch.other.x + yMatch.other.width) });
  return { rect: snapped, guides };
}

export function dashboardPositionAvailable(rect: DashboardRect, layout: DashboardLayout, id: string) {
  return !Object.entries(layout).some(([otherId, other]) => otherId !== id && rectanglesOverlap({ ...rect, height: rect.height + DASHBOARD_GAP }, { ...other, height: other.height + DASHBOARD_GAP }));
}

/** Find a nearby empty position on drop, or return to the start; never cascade other cards. */
export function finishDashboardPlacement(rect: DashboardRect, layout: DashboardLayout, id: string, fallback: DashboardRect, gapX: number, maxDistanceX: number, maxDistanceY: number): DashboardRect {
  if (dashboardPositionAvailable(rect, layout, id)) return rect;
  const xs = [rect.x], ys = [rect.y];
  for (const [otherId, other] of Object.entries(layout)) if (otherId !== id) {
    xs.push(other.x - rect.width - gapX, other.x + other.width + gapX);
    ys.push(other.y - rect.height - DASHBOARD_GAP, other.y + other.height + DASHBOARD_GAP);
  }
  const candidates: DashboardRect[] = [];
  for (const x of xs) for (const y of ys) {
    if (x < 0 || x + rect.width > DASHBOARD_WIDTH || y < 0 || Math.abs(x - rect.x) > maxDistanceX || Math.abs(y - rect.y) > maxDistanceY) continue;
    const candidate = { ...rect, x, y };
    if (dashboardPositionAvailable(candidate, layout, id)) candidates.push(candidate);
  }
  candidates.sort((a, b) => Math.hypot((a.x - rect.x) / maxDistanceX, (a.y - rect.y) / maxDistanceY) - Math.hypot((b.x - rect.x) / maxDistanceX, (b.y - rect.y) / maxDistanceY));
  return candidates[0] ?? fallback;
}
