import assert from "node:assert/strict";
import test from "node:test";
import { findClientDuplicates, matchesMergeSearch, type MergeClient } from "../src/lib/client-duplicates";

const client = (id: string, values: Partial<MergeClient> = {}): MergeClient => ({ id, name: `Cliente ${id}`, phone: "", cpf: "", active: true, ...values });

test("suggests equal names regardless of accents, spaces or case", () => {
  const pairs = findClientDuplicates([client("1", { name: "  João   Silva " }), client("2", { name: "JOAO SILVA" }), client("3", { name: "João Santos" })]);
  assert.equal(pairs.length, 1);
  assert.deepEqual(pairs[0].reasons, ["Nome igual"]);
});

test("matches formatted Brazilian phones and CPF even with different names", () => {
  const pairs = findClientDuplicates([client("1", { phone: "+55 (42) 99888-1234", cpf: "123.456.789-09" }), client("2", { phone: "42998881234", cpf: "12345678909" })]);
  assert.equal(pairs.length, 1);
  assert.deepEqual(pairs[0].reasons, ["Telefone igual", "CPF igual"]);
});

test("ignores empty identifiers, short phones, placeholder CPF and inactive clients", () => {
  assert.deepEqual(findClientDuplicates([client("1", { name: " ", phone: "123", cpf: "00000000000" }), client("2", { name: "", phone: "123", cpf: "000.000.000-00" }), client("3", { name: "Duplicado" }), client("4", { name: "Duplicado", active: false })]), []);
});

test("does not suggest unrelated contacts via transitive matches", () => {
  const pairs = findClientDuplicates([client("1", { name: "Ana", phone: "42998881234" }), client("2", { name: "Ana", phone: "41998881234" }), client("3", { name: "Bia", phone: "41998881234" })]);
  assert.equal(pairs.length, 2);
  assert.ok(!pairs.some(pair => pair.primary.id === "1" && pair.duplicate.id === "3"));
});

test("retains every matching pair and puts multiple matching identifiers first", () => {
  const clients = Array.from({ length: 12 }, (_, i) => client(String(i), { name: "Mesmo nome" }));
  clients[0].phone = "42998881234";
  clients[1].phone = "42998881234";
  const pairs = findClientDuplicates(clients);
  assert.equal(pairs.length, 66);
  assert.equal(pairs[0].reasons.length, 2);
});

test("manual search finds accented names, phones and formatted CPF", () => {
  const person = client("1", { name: "João Silva", phone: "42998881234", cpf: "123.456.789-09" });
  for (const query of ["joao", "42998881234", "+55 (42) 99888-1234", "123.456.789-09", "12345678909"]) assert.ok(matchesMergeSearch(person, query));
  assert.equal(matchesMergeSearch(person, "Maria"), false);
});
