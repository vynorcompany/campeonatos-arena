import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("mobile dark portal keeps the green identity across its main surfaces", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const finance = read("src/components/public-finance-entry-list.tsx");
  const comandas = read("src/components/portal-client-comandas.tsx");
  const league = read("src/components/tournaments/public-league-portal.tsx");
  const login = read("src/components/athlete-portal-login-layout.utilities.ts");

  assert.match(portal, /tw:dark:\[--portal-surface:#102d25\]/);
  assert.match(portal, /tw:dark:\[--portal-ink:#eaf3e9\]/);
  assert.match(read("src/components/portal/portal-navigation.tsx"), /tw:dark:bg-\[#102d25\]/);
  for (const source of [finance, comandas, league]) assert.match(source, /tw:dark:/);
  assert.match(login, /tw:dark:\[&_.public-client-auth>header_h2\]:text-\[#eafff3\]/);
  assert.match(login, /tw:dark:\[&_.public-client-auth_input:not\(\[type=checkbox\]\):not\(\[type=radio\]\):not\(\[type=hidden\]\)\]:bg-\[#104138\]/);
});

test("league schedule heading remains legible in both mobile themes", () => {
  const league = read("src/components/tournaments/public-league-portal.tsx");
  assert.match(league, /tw:viewport-700:text-\[#133047\]! tw:viewport-700:dark:text-\[#edf7fb\]!">Sugestões de horário/);
});
