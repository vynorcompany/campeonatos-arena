import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canPerformPermission } from "../src/lib/permissions";

test("permissões granulares da agenda não concedem cancelamento ou liberação por outra ação", () => {
  assert.equal(canPerformPermission("calendar:booking:edit", "STAFF", "VIEWER", ["calendar:booking:create"]), false);
  assert.equal(canPerformPermission("calendar:booking:create", "STAFF", "VIEWER", ["calendar:booking:edit"]), false);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar:booking:create"]), false);
  assert.equal(canPerformPermission("calendar:recurrence:release", "STAFF", "VIEWER", ["calendar:booking:cancel"]), false);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar:booking:cancel"]), true);
  assert.equal(canPerformPermission("calendar:recurrence:release", "STAFF", "VIEWER", ["calendar:recurrence:release"]), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar"]), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", "OWNER", "VIEWER", []), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", null, "ADMIN", []), true);
  assert.equal(canPerformPermission("calendar:event:manage", "STAFF", "VIEWER", ["calendar:booking:create"]), false);
  assert.equal(canPerformPermission("calendar:event:manage", "STAFF", "VIEWER", ["calendar:settings:manage"]), false);
  assert.equal(canPerformPermission("calendar:event:manage", "STAFF", "VIEWER", ["calendar:event:manage"]), true);
});

test("ações de configuração e cadastro rápido exigem a permissão específica antes de alterar dados", async () => {
  const source = readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const requested: string[] = [];
  const require = createRequire(import.meta.url);
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports,
    FormData,
    require: (name: string) => name === "zod" ? require("zod") : name === "@/lib/auth/guards" ? {
      requirePermission: async (key: string) => { requested.push(key); throw new Error("Sem permissão para executar esta ação."); },
      requireModuleEdit: async () => { throw new Error("Guarda genérica de módulo indevida."); },
    } : {},
  });
  const settingsActions = [
    "updateOnlineBookingSettingsAction", "createCourtWeeklyRuleAction", "updateCourtWeeklyRuleAction",
    "deleteCourtWeeklyRuleAction", "copyCourtWeeklyRuleAction", "updateScheduleSettingsAction",
    "createCourtAction", "updateCourtSettingsAction", "moveCourtAction", "copyCourtConfigurationAction",
  ];
  for (const action of settingsActions) {
    await assert.rejects(exports[action](new FormData()), /Sem permissão/);
  }
  assert.deepEqual(requested, settingsActions.map(() => "calendar:settings:manage"));
  await assert.rejects(exports.createQuickPlayerAction(new FormData()), /Sem permissão/);
  await assert.rejects(exports.createBookingTypeAction(new FormData()), /Sem permissão/);
  assert.deepEqual(requested.slice(-2), ["players:create", "arena:settings"]);
  for (const action of ["createCalendarEventAction", "updateCalendarEventAction", "deleteCalendarEventAction"]) {
    await assert.rejects(exports[action](new FormData()), /Sem permissão/);
  }
  assert.deepEqual(requested.slice(-3), ["calendar:event:manage", "calendar:event:manage", "calendar:event:manage"]);
});

test("converter evento em aula não cria registro se o evento não pertence à arena", async () => {
  const source = readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const require = createRequire(import.meta.url);
  let createdLessons = 0;
  let updatedLessons = 0;
  let refreshes = 0;
  const auth = { arenaId: "arena-a" };
  const tx = {
    calendarEvent: { deleteMany: async () => ({ count: 0 }) },
    lesson: { create: async () => { createdLessons += 1; } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, FormData, Date,
    require: (name: string) => name === "zod" ? require("zod") : name === "@/lib/auth/guards" ? {
      requirePermission: async (key: string) => {
        assert.equal(key, "calendar:event:manage");
        return auth;
      },
    } : name === "@/lib/calendar/inputs" ? {
      parseScheduledAt: (value: string) => new Date(value),
    } : name === "@/lib/prisma" ? {
      prisma: {
        $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
        lesson: { updateMany: async ({ where }: { where: { arenaId: string; id: string } }) => {
          assert.equal(where.arenaId, auth.arenaId);
          assert.equal(where.id, "own-lesson");
          updatedLessons += 1;
          return { count: 1 };
        } },
      },
    } : name === "@/lib/calendar/revalidation" ? {
      refreshCalendarRoutes: () => { refreshes += 1; },
    } : {},
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ sourceType: "calendar", lessonId: "", calendarEventId: "other-arena-event", eventType: "AULA", title: "Aula de teste", scheduledAt: "2026-10-20T10:00", durationMinutes: "60", notes: "" })) form.set(key, value);
  await assert.rejects(exports.updateCalendarEventAction(form), /Evento nao encontrado/);
  assert.equal(createdLessons, 0);
  assert.equal(refreshes, 0);

  const invalidForm = new FormData();
  for (const [key, value] of Object.entries({ eventType: "EVENTO", title: "X", scheduledAt: "2026-10-20T10:00", durationMinutes: "60", notes: "" })) invalidForm.set(key, value);
  const invalidResult = await exports.createCalendarEventAction(invalidForm) as { error?: string };
  assert.equal(invalidResult.error, "Informe um título com pelo menos 2 caracteres.");
  assert.equal(createdLessons, 0);
  assert.equal(refreshes, 0);

  const lessonForm = new FormData();
  for (const [key, value] of Object.entries({ sourceType: "lesson", lessonId: "own-lesson", calendarEventId: "", title: "Aula atualizada", scheduledAt: "2026-10-20T11:00", durationMinutes: "60", notes: "" })) lessonForm.set(key, value);
  await exports.updateCalendarEventAction(lessonForm);
  assert.equal(updatedLessons, 1);
  assert.equal(refreshes, 1);
});
