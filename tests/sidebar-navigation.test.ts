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

test("sem permissão de gestão financeira, a barra lateral não oferece configurações", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: false,
    canManageFinancialSettings: false,
    canEditStock: false,
    visibleModules: ["dashboard", "finance"],
    whatsappUnreadCount: 0,
  }));
  assert.match(markup, /href="\/financeiro\/contas-a-receber"/);
  assert.doesNotMatch(markup, /href="\/financeiro\/configuracoes"/);
});

test("submenu de relatórios coincide com todos os destinos da página inicial e exige Financeiro", () => {
  const props = { canManageUsers: false, canManageFinancialSettings: false, canEditStock: false, whatsappUnreadCount: 0 };
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
