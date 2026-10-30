import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { z } from "zod";

test("cadastro/edição de produto: moeda brasileira, observações e isolamento da arena", async () => {
  const writes: any[] = [];
  const product = {
    create: async (query: any) => {
      writes.push(query);
      return { id: "new-product" };
    },
    updateMany: async (query: any) => {
      writes.push(query);
      return { count: 1 };
    },
  };
  let forbidden = false;
  const scopedDb = {
    product,
    $transaction: async (fn: any) => fn({ product }),
  };
  const mocks: Record<string, any> = {
    zod: { z },
    "@prisma/client": { Prisma: {} },
    "@/lib/products/stock-aggregates": {},
    "@/lib/finance/receiving-bank-account": {},
    "@/lib/finance/cash-day": {},
    "@/lib/finance/cash-register-sales": {},
    "@/lib/prisma": {},
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/guards": {
      requireModuleEdit: async (module: string) => {
        assert.equal(module, "stock");
        if (forbidden) throw new Error("Sem permissão");
        return { arenaId: "arena-a", userId: "operator" };
      },
    },
    "@/lib/arena-database": {
      arenaDatabase: (arenaId: string) => {
        assert.equal(arenaId, "arena-a");
        return scopedDb;
      },
    },
  };
  const exports: any = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync("src/lib/actions/pos.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        assert.ok(name in mocks, name);
        return mocks[name];
      },
      FormData,
    },
  );
  const form = new FormData();
  Object.entries({
    productId: "product-a",
    name: "Bebida",
    sku: "",
    cost: "R$ 1.234,56",
    price: "R$\u00a02.345,67",
    stockQuantity: "0",
    minStock: "0",
    categoryId: "",
    notes: "  Servir gelado.\nGuardar em local fresco.  ",
  }).forEach(([key, value]) => form.set(key, value));
  await exports.createProductAction(form);
  assert.equal(writes[0].data.arenaId, "arena-a");
  assert.equal(writes[0].data.costCents, 123456);
  assert.equal(writes[0].data.priceCents, 234567);
  assert.equal(
    writes[0].data.notes,
    "Servir gelado.\nGuardar em local fresco.",
  );
  await exports.updateProductAction(form);
  assert.equal(writes[1].where.arenaId, "arena-a");
  assert.equal(writes[1].where.id, "product-a");
  assert.equal(writes[1].data.notes, writes[0].data.notes);
  form.delete("notes");
  await exports.updateProductAction(form);
  assert.equal(
    writes[2].data.notes,
    undefined,
    "cliente antigo não apaga observações",
  );
  form.set("notes", "");
  await exports.updateProductAction(form);
  assert.equal(writes[3].data.notes, "", "limpeza explícita das observações");
  form.set("notes", "a".repeat(2001));
  await assert.rejects(exports.updateProductAction(form), /2.000/);
  assert.equal(writes.length, 4);
  form.set("notes", "");
  form.set("price", "R$ inválido");
  await assert.rejects(exports.updateProductAction(form), /Preço inválido/);
  forbidden = true;
  await assert.rejects(exports.updateProductAction(form), /Sem permissão/);
  assert.equal(writes.length, 4);
});
