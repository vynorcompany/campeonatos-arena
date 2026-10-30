import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { parseNfeXml } from "../src/lib/fiscal/nfe-xml";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("entrada por NF-e incrementa estoque e movimentos uma única vez e rejeita produto de outra arena", { skip: !local }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const suffix = randomUUID(); const name = `Produto NF-e ${suffix}`;
  const key = Date.now().toString().padEnd(44, "0");
  const ids: string[] = [];
  try {
    const arena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const beta = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const user = await db.user.findFirstOrThrow();
    for (const arenaId of [arena.id, beta.id]) ids.push((await db.product.create({ data: { arenaId, name, sku: suffix, priceCents: 500, stockQuantity: 3 } })).id);
    const exports: { importNfeXmlAction?: (form: FormData) => Promise<unknown> } = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arena.id, userId: user.id }) },
      "@/lib/fiscal/nfe-xml": { parseNfeXml },
      "@/lib/rls": { withArenaTransaction: (id: string, fn: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return fn(tx); }) },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/fiscal.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, File, require: (name: string) => mocks[name] ?? {} });
    const xml = `<NFe><infNFe Id="NFe${key}"><ide><nNF>123</nNF></ide><emit><xNome>Fornecedor QA</xNome></emit><det nItem="1"><prod><cProd>${suffix}</cProd><xProd>${name}</xProd><qCom>2</qCom><vUnCom>2.50</vUnCom><vProd>5.00</vProd></prod></det><total><ICMSTot><vNF>5.00</vNF></ICMSTot></total></infNFe></NFe>`;
    const form = (productId = ids[0]) => { const data = new FormData(); data.set("xml", new File([xml], "entrada.xml", { type: "text/xml" })); data.set("items", JSON.stringify([{ index: 0, productId, name, sku: suffix, costCents: 250, priceCents: 500 }])); return data; };
    await assert.rejects(exports.importNfeXmlAction!(form(ids[1])), /não pertence/);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[0] } })).stockQuantity, 3);
    await exports.importNfeXmlAction!(form());
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[0] } })).stockQuantity, 5);
    assert.equal(await db.stockMovement.count({ where: { productId: ids[0], type: "IN", quantity: 2 } }), 1);
    await assert.rejects(exports.importNfeXmlAction!(form()), /já foi importada/);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[0] } })).stockQuantity, 5);
    assert.equal(await db.stockMovement.count({ where: { productId: ids[0] } }), 1);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: ids[1] } })).stockQuantity, 3);
  } finally {
    await db.fiscalDocument.deleteMany({ where: { accessKey: key } });
    await db.stockMovement.deleteMany({ where: { productId: { in: ids } } });
    await db.product.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await db.$disconnect();
  }
});
