import assert from "node:assert/strict";
import test from "node:test";
import { portalQuery } from "@/lib/portal/navigation";

test("portal navigation preserves the selected league game and category", () => {
  const query = new URLSearchParams(portalQuery("leagues", "games", undefined, "categoria 1").slice(1));
  assert.equal(query.get("section"), "leagues");
  assert.equal(query.get("tab"), "games");
  assert.equal(query.get("leagueCategory"), "categoria 1");
});

test("portal navigation maps ranking, rules and prizes to their legacy tabs", () => {
  assert.equal(new URLSearchParams(portalQuery("leagues", "ranking").slice(1)).get("tab"), "ranking");
  assert.equal(new URLSearchParams(portalQuery("leagues", "rules").slice(1)).get("tab"), "rules");
  assert.equal(new URLSearchParams(portalQuery("leagues", "prizes").slice(1)).get("tab"), "portal");
  const super12 = new URLSearchParams(portalQuery("leagues", undefined, undefined, undefined, "super12", "evento 1").slice(1));
  assert.equal(super12.get("eventTab"), "super12");
  assert.equal(super12.get("super12"), "evento 1");
});
