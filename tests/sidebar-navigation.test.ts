import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isActivePath, NavLinks } from "../src/components/layout/nav-links";

test("destinos com parâmetros mantêm o item ativo na rota correta", () => {
  assert.equal(isActivePath("/financeiro/configuracoes/notas-fiscais", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), true);
  assert.equal(isActivePath("/financeiro/configuracoes/notas-fiscais/arquivo", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), true);
  assert.equal(isActivePath("/financeiro/configuracoes/fornecedores", "/financeiro/configuracoes/notas-fiscais?secao=emissao"), false);
});

test("menus com submenu mantêm o destino clicável e um controle separado para expandir", () => {
  const markup = renderToStaticMarkup(React.createElement(NavLinks, {
    canManageUsers: true,
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
});
