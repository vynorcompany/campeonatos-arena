import assert from "node:assert/strict";
import test from "node:test";
import { defaultDashboardLayout, readDashboardLayout, rectanglesOverlap, resizeDashboardRect, settleDashboardLayout, type DashboardEdge } from "../src/lib/ui/dashboard-layout";

test("free dashboard moves neighbours without moving the dragged card or leaving overlaps", () => {
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
