import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("mobile dark portal keeps the blue identity across its main surfaces", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const finance = read("src/components/public-finance-entry-list.tsx");
  const comandas = read("src/components/portal-client-comandas.tsx");
  const league = read("src/components/tournaments/public-league-portal.tsx");
  const login = read("src/components/athlete-portal-login-layout.utilities.ts");

  assert.match(portal, /tw:dark:\[--portal-surface:#101c2d\]/);
  assert.match(portal, /tw:dark:\[--portal-ink:#e9edf3\]/);
  assert.match(read("src/components/portal/portal-navigation.tsx"), /tw:dark:bg-\[#101c2d\]/);
  for (const source of [finance, comandas, league]) assert.match(source, /tw:dark:/);
  assert.match(login, /tw:dark:\[&_.public-client-auth>header_h2\]:text-\[#eaf3ff\]/);
  assert.match(login, /tw:dark:\[&_.public-client-auth_input:not\(\[type=checkbox\]\):not\(\[type=radio\]\):not\(\[type=hidden\]\)\]:bg-\[#102441\]/);
});

test("league booking action remains legible in both themes", () => {
  const league = read("src/components/tournaments/public-league-portal.tsx");
  assert.match(league, /tw:text-blue-700 tw:dark:text-blue-200">Agendar Confronto/);
  assert.doesNotMatch(league, /Sugestões de horário/);
});
