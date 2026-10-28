import assert from "node:assert/strict";
import test from "node:test";
import { financeHomeLinks } from "../src/lib/navigation/finance-home-links";

const hrefs = (auth: Parameters<typeof financeHomeLinks>[0]) => financeHomeLinks(auth).map((item) => item.href);

test("início financeiro acompanha os destinos do menu para administrador", () => {
  assert.deepEqual(hrefs({ arenaRole: "ADMIN", systemRole: "VIEWER", viewPermissions: ["finance", "stock"], editPermissions: ["finance"] }), [
    "/financeiro/folha", "/financeiro/contas-a-receber", "/financeiro/contas-a-pagar", "/financeiro/notas-fiscais", "/pdv",
  ]);
});

test("perfil financeiro sem estoque não recebe produtos; configurações ficam fora das rotinas financeiras", () => {
  const financeOnly = { arenaRole: "STAFF", systemRole: "VIEWER", viewPermissions: ["finance"], editPermissions: ["finance"] };
  assert.deepEqual(hrefs(financeOnly), [
    "/financeiro/folha", "/financeiro/contas-a-receber", "/financeiro/contas-a-pagar", "/financeiro/notas-fiscais",
  ]);
  assert.deepEqual(hrefs({ ...financeOnly, editPermissions: [] }), [
    "/financeiro/folha", "/financeiro/contas-a-receber", "/financeiro/contas-a-pagar",
  ]);
});

test("perfil somente estoque consegue abrir o início sem ver rotinas financeiras", () => {
  assert.deepEqual(hrefs({ arenaRole: "STAFF", systemRole: "VIEWER", viewPermissions: ["stock"], editPermissions: [] }), ["/pdv"]);
  assert.deepEqual(hrefs({ arenaRole: "STAFF", systemRole: "VIEWER", viewPermissions: [], editPermissions: [] }), []);
});

test("permissão somente de recebíveis não expõe folha nem contas a pagar", () => {
  assert.deepEqual(hrefs({ arenaRole: "STAFF", systemRole: "VIEWER", viewPermissions: ["finance:receivable:view"], editPermissions: [] }), ["/financeiro/contas-a-receber"]);
});
