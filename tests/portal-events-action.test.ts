import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as runtime from "react/jsx-runtime";

test("abas de eventos: autenticação, visibilidade e carga somente do menu solicitado", async () => {
 let deny = false, visible = true; const calls: any[] = [];
 const mocks: Record<string, unknown> = {
  "react/jsx-runtime": runtime,
  "@/lib/auth/player-session": { requirePublicPlayerAuth: async (slug: string) => { assert.equal(slug, "arena-a"); if (deny) throw Error("Sem sessão"); return { playerId: "player-a", name: "Atleta A" }; } },
  "@/lib/services/public-standings": { getPublicArenaShell: async () => ({athletePortalShowLeagues: visible}), getArenaPublicStandings: async (...args: unknown[]) => {calls.push(["standings",...args]);return {selected:null};} },
  "@/lib/services/public-league-portal": { getPublicLeaguePortal: async (...args: unknown[]) => {calls.push(["league",...args]);return {pairs:[]};} },
  "@/lib/services/public-super12": { getPublicSuper12: async (...args: unknown[]) => {calls.push(["super12",...args]);return {events:[]};} },
  "@/components/portal/tournament-tabs": { PortalTournamentTabs: "tournament-tabs" },
  "@/components/public-super12": { PublicSuper12: "super12" },
  "@/components/public-event-radar": { PublicEventRadar: "radar" },
 };
 const exports: any = {};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/actions/portal-events.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>{assert.ok(name in mocks,name);return mocks[name];},Promise,Error});
 deny=true;await assert.rejects(exports.loadPortalEventPanelAction("arena-a","super12"),/Sem sessão/); assert.equal(calls.length,0);
 deny=false;visible=false;await assert.rejects(exports.loadPortalEventPanelAction("arena-a","leagues"),/indisponíveis/);assert.equal(calls.length,0);
 visible=true;await assert.rejects(exports.loadPortalEventPanelAction("arena-a","invalid"),/Menu inválido/);assert.equal(calls.length,0);
 const super12=await exports.loadPortalEventPanelAction("arena-a","super12",undefined,"round-a");assert.equal(super12.type,"super12");assert.deepEqual(calls,[["super12","arena-a","player-a","round-a"]]);
 calls.length=0;const radar=await exports.loadPortalEventPanelAction("arena-a","radar");assert.equal(radar.type,"radar");assert.equal(calls.length,0);
 const league=await exports.loadPortalEventPanelAction("arena-a","leagues","category-a");assert.equal(league.type,"tournament-tabs");assert.equal(league.props.playerName,"Atleta A");assert.deepEqual(calls[0],["league","arena-a","player-a","category-a"]);assert.equal(calls[1][0],"standings");assert.equal(calls[1][1],"arena-a");assert.equal((calls[1][2] as unknown as {league: string}).league,"category-a");
});
