import assert from "node:assert/strict";
import test from "node:test";
import { defaultDashboardLayout, readDashboardLayout, rectanglesOverlap, resizeDashboardRect, settleDashboardLayout, type DashboardEdge } from "../src/lib/ui/dashboard-layout";

test("initial layout settlement preserves its anchor and prevents overlapping measurements", () => {
  const layout = { a: { x: 0, y: 100, width: 400, height: 180 }, b: { x: 200, y: 200, width: 400, height: 200 }, c: { x: 200, y: 400, width: 400, height: 120 }, d: { x: 900, y: 100, width: 300, height: 120 } };
  const settled = settleDashboardLayout(layout, "a");
  assert.deepEqual(settled.a, layout.a);
  assert.deepEqual(settled.d, layout.d);
  assert.ok(settled.b.y >= settled.a.y + settled.a.height);
  for (const [id, a] of Object.entries(settled)) for (const [other, b] of Object.entries(settled)) if (id !== other) assert.equal(rectanglesOverlap(a, b), false);
  assert.equal(layout.b.y, 200, "preview must preserve the starting layout for Escape/cancel");
});

test("every border and corner resizes continuously while its opposite edge remains anchored", () => {
  const original = { x: 200, y: 200, width: 400, height: 300 };
  for (const edge of ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as DashboardEdge[]) {
    const rect = resizeDashboardRect(original, edge, 37, 23, 220, 100);
    assert.notDeepEqual(rect, original, edge);
    if (edge.includes("w")) { assert.equal(rect.x, 237); assert.equal(rect.x + rect.width, 600); }
    if (edge.includes("e")) { assert.equal(rect.x, 200); assert.equal(rect.width, 437); }
    if (edge.includes("n")) { assert.equal(rect.y, 223); assert.equal(rect.y + rect.height, 500); }
    if (edge.includes("s")) { assert.equal(rect.y, 200); assert.equal(rect.height, 323); }
  }
});

test("resize keeps content readable and stays inside the canvas", () => {
  const original = { x: 200, y: 200, width: 400, height: 300 };
  const smallest = resizeDashboardRect(original, "nw", 2000, 2000, 220, 180);
  assert.equal(smallest.width, 220); assert.equal(smallest.height, 180);
  assert.equal(smallest.x + smallest.width, 600); assert.equal(smallest.y + smallest.height, 500);
  const largest = resizeDashboardRect(original, "ne", 2000, -2000, 220, 180);
  assert.equal(largest.y, 0); assert.equal(largest.x + largest.width, 1200);
});

test("stored layouts reject malformed dimensions, clamp to the viewport and include new cards", () => {
  const defaults = defaultDashboardLayout([{ id: "a", kind: "metric" }, { id: "b", kind: "chart" }], 800);
  const saved = readDashboardLayout({ a: { x: -50, y: -100, width: 10, height: 90 }, b: { x: 0, y: 0, width: "bad", height: 10 }, unknown: { x: 0, y: 0, width: 100, height: 100 } }, defaults, { a: 330, b: 420 });
  assert.equal(saved.a.x, 0); assert.equal(saved.a.y, 0); assert.equal(saved.a.width, 330);
  assert.deepEqual(saved.b, defaults.b);
  assert.deepEqual(Object.keys(saved), ["a", "b"]);
});

test("alignment guides snap edges and centers without mutating any neighbour", async () => {
  const { snapDashboardRect } = await import("../src/lib/ui/dashboard-layout");
  const layout = { a: { x: 0, y: 0, width: 240, height: 120 }, b: { x: 400, y: 300, width: 300, height: 180 } };
  const original = structuredClone(layout);
  const edges = snapDashboardRect({ x: 404, y: 20, width: 240, height: 120 }, layout, "a", 8, 8, 12);
  assert.equal(edges.rect.x, 400);
  assert.ok(edges.guides.some(guide => guide.axis === "x" && guide.position === 400));
  const center = snapDashboardRect({ x: 432, y: 30, width: 240, height: 120 }, layout, "a", 8, 8, 12);
  assert.equal(center.rect.x + center.rect.width / 2, 550);
  const gap = snapDashboardRect({ x: 20, y: 494, width: 240, height: 120 }, layout, "a", 8, 8, 12);
  assert.equal(gap.rect.y, 492);
  assert.deepEqual(layout, original);
});

test("resizing snaps only the chosen edge and respects minimum dimensions", async () => {
  const { snapDashboardRect } = await import("../src/lib/ui/dashboard-layout");
  const layout = { b: { x: 400, y: 300, width: 300, height: 180 } };
  const result = snapDashboardRect({ x: 100, y: 0, width: 296, height: 120 }, layout, "a", 8, 8, 12, "e", 220, 110);
  assert.equal(result.rect.x, 100); assert.equal(result.rect.width, 300);
  assert.equal(result.rect.height, 120);
});

test("occupied drops find nearby space or return to their start without cascading the layout", async () => {
  const { finishDashboardPlacement, dashboardPositionAvailable } = await import("../src/lib/ui/dashboard-layout");
  const start = { x: 0, y: 0, width: 240, height: 120 };
  const layout = { a: start, b: { x: 300, y: 200, width: 300, height: 180 }, c: { x: 1000, y: 200, width: 200, height: 180 } };
  const original = structuredClone(layout);
  const near = finishDashboardPlacement({ ...start, x: 580, y: 200 }, layout, "a", start, 12, 48, 48);
  assert.equal(dashboardPositionAvailable(near, layout, "a"), true);
  assert.equal(near.x, 612);
  const occupied = finishDashboardPlacement({ ...start, x: 330, y: 220 }, layout, "a", start, 12, 20, 20);
  assert.deepEqual(occupied, start);
  assert.deepEqual(layout, original);
});


test("nearby alignment takes priority over a slightly closer anchor on a distant card", async () => {
  const { snapDashboardRect } = await import("../src/lib/ui/dashboard-layout");
  const result = snapDashboardRect({ x: 482.9, y: 200, width: 240, height: 132 }, { near: { x: 480, y: 0, width: 240, height: 132 }, far: { x: 603.475, y: 800, width: 294, height: 132 } }, "active", 6, 8, 12);
  assert.equal(result.rect.x, 480);
  assert.equal(result.guides[0].position, 480);
  assert.equal(result.guides[0].start, 0);
});


test("drop validation keeps the same vertical gutter used when restoring saved layouts", async () => {
  const { dashboardPositionAvailable } = await import("../src/lib/ui/dashboard-layout");
  const layout = { b: { x: 0, y: 0, width: 300, height: 132 } };
  assert.equal(dashboardPositionAvailable({ x: 0, y: 132, width: 300, height: 132 }, layout, "a"), false);
  assert.equal(dashboardPositionAvailable({ x: 0, y: 144, width: 300, height: 132 }, layout, "a"), true);
});
