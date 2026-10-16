import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

function fixture(options: { teacherExists?: boolean; studentId?: string } = {}) {
  const calls: Array<{ model: string; args: any }> = [];
  const tx = {
    teacher: { findFirst: async (args: any) => {
      calls.push({ model: "teacher", args });
      return options.teacherExists === false ? null : { id: "teacher-1" };
    } },
    student: {
      findFirst: async (args: any) => {
        calls.push({ model: "student-find", args });
        return options.studentId === "foreign" ? null : { id: options.studentId };
      },
      upsert: async (args: any) => {
        calls.push({ model: "student-upsert", args });
        return { id: "student-new" };
      },
    },
    teacherStudent: { upsert: async (args: any) => {
      calls.push({ model: "assignment", args });
      return { id: "assignment-1" };
    } },
  };
  const exports: Record<string, any> = {};
  const source = readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8");
  const mocks: Record<string, unknown> = {
    "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: "arena-1" }) },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<void>) => callback(tx) },
    "@/lib/academy/revalidation": { refreshAcademyRoutes: () => {} },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports,
    require: (name: string) => name in mocks ? mocks[name] : name.startsWith("@/") ? {} : nodeRequire(name),
  });
  const form = new FormData();
  form.set("teacherId", "teacher-1");
  form.set("studentId", options.studentId ?? "");
  form.set("newStudentName", "Aluno novo");
  form.set("newStudentPhone", "11999999999");
  return { run: () => exports.createTeacherStudentAction(form), calls };
}

test("novo aluno é vinculado ao professor pelo ID criado, na mesma arena", async () => {
  const { run, calls } = fixture();
  await run();
  assert.deepEqual(calls.map((call) => call.model), ["teacher", "student-upsert", "assignment"]);
  assert.equal(calls[1].args.where.arenaId_name.arenaId, "arena-1");
  assert.equal(calls[2].args.where.teacherId_studentId.studentId, "student-new");
  assert.equal(calls[2].args.create.studentId, "student-new");
  assert.equal(calls[2].args.create.arenaId, "arena-1");
});

test("professor inválido não cria aluno órfão", async () => {
  const { run, calls } = fixture({ teacherExists: false });
  await assert.rejects(run(), /Professor não encontrado/);
  assert.deepEqual(calls.map((call) => call.model), ["teacher"]);
});

test("aluno de outra arena não pode ser vinculado", async () => {
  const { run, calls } = fixture({ studentId: "foreign" });
  await assert.rejects(run(), /Aluno não encontrado/);
  assert.equal(calls[1].args.where.arenaId, "arena-1");
  assert.deepEqual(calls.map((call) => call.model), ["teacher", "student-find"]);
});
