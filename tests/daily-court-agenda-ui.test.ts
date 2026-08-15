import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("daily court agenda renders time rows, court columns and a configuration entry point", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");

  assert.match(page, /agenda-date-strip/);
  assert.match(page, /agenda-date-item-centered/);
  assert.match(page, /scheduleOccurrences/);
  assert.match(page, /daily-court-grid/);
  assert.match(page, /Agenda de quadras/);
  assert.match(page, /\/agenda\/configuracao/);
  assert.match(page, /priceCents/);
  assert.match(page, /Indisponível/);
  assert.doesNotMatch(page, /<header className="page-header agenda-header">/);
});

test("agenda configuration keeps court registration separate from the daily view", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");

  assert.match(page, /Configuração da agenda/);
  assert.match(page, /Quadra selecionada/);
  assert.match(page, /Dia da semana/);
  assert.match(page, /name="court"/);
  assert.match(page, /Nova quadra/);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(page, /Quadras cadastradas/);
});
