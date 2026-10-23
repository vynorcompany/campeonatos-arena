import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isActivePath, NavLinks } from "../src/components/layout/nav-links";
import { reportLinks } from "../src/lib/navigation/report-links";

test("destinos com parâmetros mantêm o item ativo na rota correta", () => {
  assert.equal(isActivePath("/financeiro/configuracoes/notas-fiscais", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), true);
  assert.equal(isActivePath("/financeiro/configuracoes/notas-fiscais/arquivo", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), true);
  assert.equal(isActivePath("/financeiro/configuracoes/fornecedores", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), false);
});

test("menus com submenu mantêm o destino clicável e um controle separado para expandir", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: true,
    canManageFinancialSettings: true,
    financeView: { receivable: true, payable: true, reports: true },
    canEditStock: true,
    visibleModules: ["dashboard", "support", "pos", "tournaments", "calendar", "tv", "players", "teachers", "finance", "stock", "matches"],
    whatsappUnreadCount: 0
  }));

  for (const [name, href] of [["Torneios", "/torneios"], ["Tela da TV", "/proximos-jogos/apresentacao"], ["Financeiro", "/financeiro"], ["Relatórios", "/relatorios"]]) {
    const link = markup.match(new RegExp(`<a[^>]+href="${href}"[^>]*>([\\s\\S]*?)<\\/a>`));
    assert.ok(link, `faltou o link para ${name}`);
    assert.match(link[1], new RegExp(name));
    assert.match(markup, new RegExp(`aria-label="Abrir submenu ${name}"`));
  }
  assert.match(markup, /href="\/auditoria"/);
  assert.ok(markup.indexOf('href="/auditoria"') > markup.indexOf('href="/relatorios"'), "Auditoria deve aparecer depois de Relatórios");
  assert.match(markup, /href="\/pdv\/caixa"/);
  assert.match(markup, /href="\/jogadores"/);
  assert.equal(isActivePath("/jogadores", "/jogadores"), true);
  assert.equal(isActivePath("/jogadores/arquivo", "/jogadores"), true);
});

test("links da barra lateral voltam ao topo ao trocar de página", () => {
  for (const path of ["nav-links.tsx", "app-shell.tsx", "sidebar-user-menu.tsx"]) {
    const source = readFileSync(new URL(`../src/components/layout/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /<Link\b[^>]*scroll=\{false\}/, `${path} não deve preservar a rolagem da página anterior`);
  }
});

test("atalho de configurações só aponta para uma página autorizada", () => {
  const shell = readFileSync(new URL("../src/components/layout/app-shell.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../src/app/(app)/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /canManageCourtSettings=\{canPerformPermission\("calendar:settings:manage"/);
  assert.match(shell, /visibleModules\.includes\("arena"\) \? "\/arena" : visibleModules\.includes\("calendar"\) && canManageCourtSettings \? "\/agenda\/configuracao" : null/);
  assert.match(shell, /settingsHref \? <nav/);
  assert.match(shell, /<Link href=\{settingsHref\}/);
});

test("sem permissão de gestão financeira, a barra lateral não oferece configurações", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: false,
    canManageFinancialSettings: false,
    financeView: { receivable: true, payable: false, reports: false },
    canEditStock: false,
    visibleModules: ["dashboard", "finance"],
    whatsappUnreadCount: 0,
  }));
  assert.match(markup, /href="\/financeiro\/contas-a-receber"/);
  assert.doesNotMatch(markup, /href="\/financeiro\/configuracoes"/);
});

test("submenu de relatórios coincide com todos os destinos da página inicial e exige Financeiro", () => {
  const props = { canManageUsers: false, canManageFinancialSettings: false, financeView: { receivable: true, payable: true, reports: true }, canEditStock: false, whatsappUnreadCount: 0 };
  const allowed = renderToStaticMarkup(React.createElement(NavLinks, { ...props, visibleModules: ["dashboard", "finance"] }));
  const restricted = renderToStaticMarkup(React.createElement(NavLinks, { ...props, visibleModules: ["dashboard"] }));
  for (const { href } of reportLinks) {
    assert.match(allowed, new RegExp(`href="${href}"`));
    assert.doesNotMatch(restricted, new RegExp(`href="${href}"`));
  }
});

test("stock-only navigation leads to readable pages without balance creation", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: false,
    canManageFinancialSettings: false,
    financeView: { receivable: false, payable: false, reports: false },
    canEditStock: false,
    visibleModules: ["dashboard", "stock"],
    whatsappUnreadCount: 0,
  }));
  assert.match(markup, /href="\/pdv"[^>]*>[\s\S]*?Financeiro/);
  assert.match(markup, /href="\/pdv\/estoque"/);
  assert.match(markup, /href="\/pdv\/servicos"/);
  assert.doesNotMatch(markup, /href="\/pdv\/balanco"/);
  assert.doesNotMatch(markup, /href="\/financeiro\/configuracoes"/);
});

test("acesso somente a recebíveis oculta contas a pagar, folha e relatórios", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: false,
    canManageFinancialSettings: false,
    financeView: { receivable: true, payable: false, reports: false },
    canEditStock: false,
    visibleModules: ["dashboard", "finance"],
    whatsappUnreadCount: 0,
  }));
  assert.match(markup, /href="\/financeiro\/contas-a-receber"/);
  for (const href of ["/financeiro/folha", "/financeiro/contas-a-pagar", "/relatorios", ...reportLinks.map((item) => item.href)]) {
    assert.doesNotMatch(markup, new RegExp(`href="${href}"`));
  }
});

test("perfil somente Jogos encontra programação e placares sem acesso à gestão", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: false,
    canManageFinancialSettings: false,
    financeView: { receivable: false, payable: false, reports: false },
    canEditStock: false,
    visibleModules: ["dashboard", "matches"],
    whatsappUnreadCount: 0,
  }));
  assert.match(markup, /href="\/torneios"[^>]*>[\s\S]*?Jogos/);
  assert.equal((markup.match(/href="\/torneios"/g) ?? []).length, 1);

  assert.doesNotMatch(markup, /href="\/torneios\/rankings"/);
});
