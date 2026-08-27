import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("sidebar exposes the compact arena workspaces and keeps settings near sign out", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");
  assert.match(navigation, /label: "Dashboard"/);
  assert.match(navigation, /label: "Torneios"/);
  assert.match(navigation, /label: "Grade de Horários"/);
  assert.doesNotMatch(navigation, /href: "\/agenda\/configuracao", label: "Configuração"/);
  assert.match(navigation, /label: "Tela da TV"/);
  assert.match(navigation, /label: "Comandas"/);
  assert.match(navigation, /label: "Clientes"/);
  assert.doesNotMatch(navigation, /title: "Administração"/);
  assert.match(shell, /sidebar-settings-menu[\s\S]*Configurações[\s\S]*href="\/arena"[\s\S]*Sair/);
  assert.match(navigation, /title: "Gestão"/);
  assert.doesNotMatch(navigation, /title: "Financeiro"/);
  assert.doesNotMatch(navigation, /Suporte\/Ajuda/);
});

test("settings menu exposes court configuration outside the schedule grade", () => {
  const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");

  assert.match(shell, /sidebar-settings-menu/);
  assert.match(shell, /href="\/agenda\/configuracao"[\s\S]*Configuração de quadras/);
});

test("sidebar and dashboard share the new operational visual system", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const dashboard = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/page.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(navigation, /nav-chevron/);
  assert.match(dashboard, /workspace-page/);
  assert.match(styles, /\.sidebar\s*\{[\s\S]*?linear-gradient\(180deg, #061d46/s);
  assert.match(styles, /\.workspace-page\s*\{/);
});

test("sidebar groups financial routines and reports in dedicated expandable modules", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");

  assert.match(navigation, /label: "Financeiro"/);
  assert.match(navigation, /label: "Contas a Receber"/);
  assert.match(navigation, /label: "Contas a Pagar"/);
  assert.match(navigation, /label: "Produtos e Serviços"/);
  assert.match(navigation, /label: "Configurações Financeiras"/);
  assert.match(navigation, /label: "Notas Fiscais"/);
  assert.match(navigation, /label: "Contas Bancárias"/);
  assert.match(navigation, /label: "Pagamentos Online"/);
  assert.match(navigation, /label: "Relatórios"/);
  assert.match(navigation, /label: "DRE Gerencial"/);
  assert.match(navigation, /label: "Relatório de Reservas"/);
});

test("financial configuration and report routes have dedicated base pages", () => {
  const financeConfig = readFileSync(resolve(process.cwd(), "src/app/(app)/financeiro/configuracoes/[area]/page.tsx"), "utf8");
  const reports = readFileSync(resolve(process.cwd(), "src/app/(app)/relatorios/[relatorio]/page.tsx"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");

  assert.match(financeConfig, /requireModuleView\("finance"\)/);
  assert.match(reports, /requireModuleView\("finance"\)/);
  assert.match(reports, /Relatório de Planos/);
  assert.match(reports, /Relatório de Reservas/);
  assert.match(schema, /model FinancialCategory/);
  assert.match(schema, /model PaymentMethodSetting/);
  assert.match(schema, /model BankAccount/);
  assert.match(schema, /model Supplier/);
  assert.match(actions, /export async function createFinancialSettingAction/);
  assert.match(financeConfig, /SafeActionForm/);
});
