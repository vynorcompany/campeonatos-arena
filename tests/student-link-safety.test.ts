import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Student = { id: string; playerId: string | null; phone: string; email: string; notes: string };

function createStudentActionForTest(existingStudent: Student | null, linkedPlayer: { id: string; name: string } | null) {
  const writes: Array<{ kind: string; data: Record<string, unknown> }> = [];
  const source = readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8");
  const exports: Record<string, (formData: FormData) => Promise<void>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/auth/guards") return { requireModuleEdit: async () => ({ arenaId: "arena-a" }) };
      if (name === "@/lib/academy/action-schemas") return { studentSchema: { safeParse: () => ({ success: true, data: { playerId: "new-player", name: "Nome repetido", phone: "", email: "", remainingClasses: 0, notes: "" } }) } };
      if (name === "@/lib/academy/revalidation") return { refreshAcademyRoutes: () => undefined };
      if (name === "@/lib/prisma") return { prisma: {
        player: { findFirst: async () => linkedPlayer },
        student: {
          findFirst: async () => existingStudent,
          update: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "update", data }); },
          create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ kind: "create", data }); },
        },
      } };
      return {};
    },
  });
  return { action: exports.createStudentAction, writes };
}

test("creating a student never transfers a same-name student's link to another player", async () => {
  const { action, writes } = createStudentActionForTest({ id: "student-a", playerId: "player-a", phone: "", email: "", notes: "" }, { id: "new-player", name: "Nome repetido" });
  await assert.rejects(action(new FormData()), /já está vinculado a outro cliente/);
  assert.deepEqual(writes, []);
});

test("a legacy unlinked student may be linked to the selected player", async () => {
  const { action, writes } = createStudentActionForTest({ id: "student-a", playerId: null, phone: "", email: "", notes: "" }, { id: "new-player", name: "Nome repetido" });
  await action(new FormData());
  assert.equal(writes.length, 1);
  assert.equal(writes[0].kind, "update");
  assert.equal(writes[0].data.playerId, "new-player");
});

test("a player from another arena cannot be silently replaced by an unlinked student", async () => {
  const { action, writes } = createStudentActionForTest(null, null);
  await assert.rejects(action(new FormData()), /Cliente não encontrado nesta arena/);
  assert.deepEqual(writes, []);
});
