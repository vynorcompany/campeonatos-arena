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
});
