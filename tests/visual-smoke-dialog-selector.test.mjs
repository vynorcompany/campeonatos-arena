import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { dialogByAccessibleName } from "../scripts/lib/dialog-by-accessible-name.mjs";
test("smoke localiza diálogos por aria-label ou pelo título aria-labelledby, respeitando a precedência acessível", () => {
  const labeled = { getAttribute: (key) => key === "aria-label" ? "Notificações" : null };
  const heading = { getAttribute: (key) => key === "aria-labelledby" ? "first second" : key === "aria-label" ? "Nome antigo" : null };
  const titles = { first: { textContent: "Mesclar" }, second: { textContent: "  contatos " } };
  const lookup = vm.runInNewContext(`(${dialogByAccessibleName.toString()})`, { document: { querySelectorAll: () => [labeled, heading], getElementById: (id) => titles[id] } });
  assert.equal(lookup("Notificações"), labeled);
  assert.equal(lookup("Mesclar contatos"), heading);
  assert.equal(lookup("Mesclar ", true), heading);
  assert.equal(lookup("Nome antigo"), null);
  assert.equal(lookup("Não existe"), null);
});
