import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { ZodError } from "zod";
import { ProductFiscalValidationError } from "../src/lib/fiscal/product-profile";
test("fiscal action: autorização precede consulta e erros esperados chegam legíveis ao formulário", async () => {
  let deny = false,
    failure: unknown = null,
    calls = 0;
  const refreshed: string[] = [];
  const mocks: Record<string, unknown> = {
    zod: { ZodError },
    "@/lib/fiscal/product-profile": { ProductFiscalValidationError },
    "next/cache": { revalidatePath: (path: string) => refreshed.push(path) },
    "@/lib/auth/guards": {
      requireModuleEdit: async (module: string) => {
        assert.equal(module, "stock");
        if (deny) throw new Error("Sem permissão");
        return { arenaId: "arena-a", userId: "operator", userName: "Operador" };
      },
    },
    "@/lib/arena-database": {
      arenaDatabase: (arenaId: string) => {
        assert.equal(arenaId, "arena-a");
        return { $transaction: async (fn: (tx: object) => unknown) => fn({}) };
      },
    },
    "@/lib/fiscal/product-profile-service": {
      saveProductFiscalProfile: async (
        _tx: object,
        arenaId: string,
        userId: string,
        productId: string,
      ) => {
        calls++;
        assert.equal(arenaId, "arena-a");
        assert.equal(userId, "operator");
        assert.equal(productId, "product-a");
        if (failure) throw failure;
      },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("src/lib/actions/product-fiscal.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module,
      exports: module.exports,
      require: (name: string) => {
        if (!(name in mocks)) throw new Error("Unexpected dependency " + name);
        return mocks[name];
      },
      console: { error() {} },
    },
  );
  const action = (
    module.exports as {
      updateProductFiscalProfileAction: (form: FormData) => Promise<unknown>;
    }
  ).updateProductFiscalProfileAction;
  const form = new FormData();
  form.set("productId", "product-a");
  form.set("arenaId", "foreign-arena");
  form.set("fiscalProfile", "{}");
  deny = true;
  await assert.rejects(action(form), /Sem permissão/);
  assert.equal(calls, 0);
  deny = false;
  failure = new ProductFiscalValidationError(
    "NCM não encontrado na tabela oficial vigente.",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(await action(form))), {
    error: "NCM não encontrado na tabela oficial vigente.",
  });
  assert.equal(refreshed.length, 0);
  failure = new Error("database-internal-secret");
  const result = JSON.stringify(await action(form));
  assert.ok(!result.includes("internal-secret"));
  assert.match(result, /Não foi possível salvar/);
  failure = null;
  await action(form);
  assert.deepEqual(refreshed, ["/pdv/product-a", "/pdv/estoque"]);
  form.set("fiscalProfile", "invalid-json");
  assert.match(JSON.stringify(await action(form)), /Revise/);
  assert.equal(calls, 3);
});
