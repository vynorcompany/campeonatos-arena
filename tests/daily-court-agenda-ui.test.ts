import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("daily court agenda renders time rows, court columns and a configuration entry point", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");

  assert.match(page, /Agenda diária por quadra/);
  assert.match(page, /scheduleOccurrences/);
  assert.match(page, /daily-court-grid/);
  assert.match(page, /Agenda de quadras/);
  assert.match(page, /\/agenda\/configuracao/);
});

test("agenda configuration keeps court registration separate from the daily view", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");

  assert.match(page, /Configuração da agenda/);
  assert.match(page, /Horário de abertura/);
  assert.match(page, /Horário de encerramento/);
  assert.match(page, /Intervalo da grade/);
  assert.match(page, /Nova quadra/);
});
