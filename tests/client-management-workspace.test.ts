import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("client workspace exposes operational filters, balances and plan history", () => {
  const page = readFileSync(resolve(process.cwd(), "src/components/players/client-management-workspace.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/client-management.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const agendaPage = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");

  assert.match(page, /Status financeiro/);
  assert.match(page, /Plano\/pacote ativo/);
  assert.match(page, /Mesclar contatos/);
  assert.match(page, /Histórico de planos/);
  assert.match(page, /Controle de saldo/);
  assert.match(actions, /adjustClientBalanceAction/);
  assert.match(actions, /mergeClientsAction/);
  assert.match(schema, /model ClientBalanceMovement/);
  assert.match(agenda, /Escape/);
  assert.match(agendaPage, /Aguardando confirmação/);
});
