import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { PrismaClient } from "@prisma/client";

const factories = new WeakMap<object, (arenaId: string) => PrismaClient>();
/** Execute the production tenant proxy against the test's own client, without loading application secrets. */
export function arenaDatabaseForTest(client: PrismaClient, arenaId: string) {
  let factory = factories.get(client);
  if (!factory) {
    const exports: { arenaDatabase?: (arenaId: string) => PrismaClient } = {};
    const source = readFileSync(new URL("../../src/lib/arena-database.ts", import.meta.url), "utf8");
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports,
      require(name: string) {
        if (name === "@/lib/prisma") return { prisma: client };
        if (name === "@/lib/audit/request-context") return { noteAuditArena() {} };
        throw new Error(`Unexpected tenant proxy dependency: ${name}`);
      },
    });
    factory = exports.arenaDatabase!; factories.set(client, factory);
  }
  return factory(arenaId);
}
