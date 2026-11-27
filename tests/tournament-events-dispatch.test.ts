import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/tournament-events";
function fixture() {
 const exports: Record<string, Function> = {}, called: string[] = [];
 let fail = "";
 const invoke = async (name: string, ...args: any[]) => { called.push(name); const effects = args.at(-1); if (fail) throw Error(fail); effects.refreshTournamentRoutes(); if (name === "category") effects.redirect("/torneios/event/categorias/category"); if (name === "update") { effects.revalidatePath("/torneios/event"); return { error: effects.errorMessage(Error("private database credential")), success: null }; } return { error: null, success: "Salvo", tournamentId: "event" }; };
 const actions = Object.fromEntries([["createTournamentAction", "create"], ["updateTournamentAction", "update"], ["removeTournamentCategoryAction", "remove"], ["createTournamentCategoryAction", "category"], ["finishTournamentAction", "finish"], ["reopenTournamentAction", "reopen"], ["deleteTournamentAction", "delete"], ["updateTournamentStatusAction", "status"]].map(([key, name]) => [key, (...args: any[]) => invoke(name, ...args)]));
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/backend/services/tournament-event-mutations.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, FormData, Error, require: (name: string) => name === "server-only" ? {} : name.endsWith("tournament-events-actions") ? actions : contracts });
 return { exports, called, fail: (value: string) => fail = value };
}
test("event dispatcher returns effects per request, preserving redirects and hiding unexpected failures", async () => {
 const f = fixture(); const category = await f.exports.executeTournamentEventMutation("create-category", {}); assert.equal(category.redirect, "/torneios/event/categorias/category"); assert.equal(category.refresh, true);
 const created = await f.exports.executeTournamentEventMutation("create", {}); assert.equal(created.redirect, null); assert.equal(created.state.tournamentId, "event");
 const update = await f.exports.executeTournamentEventMutation("update", {}); assert.equal(update.state.error.includes("credential"), false); assert.equal(update.paths[0].path, "/torneios/event");
 f.fail("Ranking individual inválido para esta arena."); const denied = await f.exports.executeTournamentEventMutation("create", {}); assert.equal(denied.refresh, false); assert.equal(denied.state.error, "Ranking individual inválido para esta arena.");
 f.fail("private Prisma connection string"); await assert.rejects(f.exports.executeTournamentEventMutation("create", {}), /private Prisma/);
});
