import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Portal agrupa Ligas e Super 12 dentro de Eventos", () => {
  const portal = source("src/components/tournaments/public-standings.tsx");
  assert.match(portal, />Eventos</);
  assert.match(portal, />Super 12</);
  assert.match(portal, /selectedEventTab/);
});

test("Super 12 permanece separado das estruturas oficiais de torneio", () => {
  const schema = source("prisma/schema.prisma");
  const action = source("src/lib/actions/public-super12.ts");
  assert.match(schema, /model Super12Event/);
  assert.match(schema, /model Super12Match/);
  assert.match(action, /SUPER12/);
  assert.match(action, /Selecione de 4 a 24 atletas/);
  assert.match(action, /status: "ACTIVE"/);
});
