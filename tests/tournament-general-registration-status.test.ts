import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
function nodes(value: any): any[] {
 if (Array.isArray(value)) return value.flatMap(nodes);
 if (!value || typeof value !== "object" || !value.props) return [];
 return [value, ...nodes(value.props.children)];
}
async function render(category: any) {
 const exports: any = {};
 const tournament = { id: "event", name: "Event", registrationPhase: "REGISTRATIONS", categories: [category], categoryBrackets: [] };
 const source = readFileSync(new URL("../src/app/(app)/torneios/inscricoes/page.tsx", import.meta.url), "utf8");
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports,
  require(name: string) {
   if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) };
   if (name === "next/link") return { default: "link" };
   if (name === "next/navigation") return { redirect: () => { throw Error("Unexpected redirect"); } };
   if (name === "@/lib/auth/guards") return { requireModuleView: async () => ({ arenaId: "arena", arenaRole: "ADMIN" }) };
   if (name === "@/lib/permissions") return { canPerformPermission: () => true };
   if (name === "@/lib/arena-database") return { arenaDatabase: () => ({ tournament: { findMany: async () => [{ id: "event", name: "Event" }], findFirst: async () => tournament }, bankAccount: { findMany: async () => [] } }) };
   if (name === "@/lib/services/tournament") return { getTournamentScheduleConflicts: async () => [] };
   if (name === "@/lib/tournaments/registration-deletion") return { canEditManualTournamentRegistration: () => false };
   if (name.endsWith(".utilities")) return { viewStyles: new Proxy({}, { get: () => "" }) };
   if (name === "@/components/tournaments/tournament-workspace") return { tournamentWorkspace: new Proxy({}, { get: () => "" }) };
   if (name.startsWith("@/components/") || name === "@/lib/actions/tournament") return new Proxy({}, { get: (_target, key) => String(key) });
   throw Error(`Unexpected dependency: ${name}`);
  },
 });
 const root = await exports.default({ searchParams: Promise.resolve({ tournamentId: "event" }) });
 return nodes(root).filter(node => node.type === "TournamentRegistrationRow").map(node => node.props);
}
const registration = { id: "registration", categoryId: "category", leadName: "Athlete One", partnerName: "Athlete Two", leadPlayerId: "one", partnerPlayerId: "two", status: "CONFIRMED", paymentStatus: "PENDING", paymentProvider: "PAY_ON_SITE", amountCents: 7500 };
const category = { id: "category", name: "Category", registrationType: "PAIR", registrations: [registration], competition: null };
test("general registrations distinguish confirmation from onsite unpaid and settled payments", async () => {
 for (const [paymentStatus, expected] of [["PENDING", /local/i], ["PAID", /^Pago$/], ["REVIEW", /análise/i], ["REFUNDED", /Estornado/i]]) {
  const rows = await render({ ...category, registrations: [{ ...registration, paymentStatus }] });
  assert.equal(rows.length, 1);
  assert.match(rows[0].payment, expected);
  assert.equal(rows[0].situation, paymentStatus === "REFUNDED" ? "Cancelada" : "Confirmada");
 }
});
test("a represented team retains its linked real payment status without duplicate registration rows", async () => {
 const pair = { id: "team", name: "Team", players: [{ player: { id: "one", name: "Athlete One" } }, { player: { id: "two", name: "Athlete Two" } }] };
 const rows = await render({ ...category, competition: { format: "LEAGUE", pairs: [pair] }, registrations: [{ ...registration, paymentStatus: "PAID" }] });
 assert.equal(rows.length, 1);
 assert.equal(rows[0].payment, "Pago");
 assert.match(rows[0].amount, /75,00/);
});
test("a team without a linked registration never fabricates a payment status", async () => {
 const rows = await render({ ...category, registrations: [], competition: { format: "LEAGUE", pairs: [{ id: "team", name: "Team", players: [{ player: { id: "one", name: "One" } }, { player: { id: "two", name: "Two" } }] }] } });
 assert.equal(rows.length, 1);
 assert.match(rows[0].payment, /Sem cobrança vinculada/i);
 assert.equal(rows[0].amount, "—");
});
test("a previous canceled enrollment does not hide the current paid enrollment of the same team", async () => {
 const pair = { id: "team", name: "Team", players: [{ player: { id: "one", name: "Athlete One" } }, { player: { id: "two", name: "Athlete Two" } }] };
 const rows = await render({ ...category, competition: { format: "LEAGUE", pairs: [pair] }, registrations: [{ ...registration, id: "old", status: "CANCELED", paymentStatus: "REFUNDED" }, { ...registration, id: "new", paymentStatus: "PAID" }] });
 assert.equal(rows.length, 1);
 assert.equal(rows[0].situation, "Confirmada");
 assert.equal(rows[0].payment, "Pago");
});
