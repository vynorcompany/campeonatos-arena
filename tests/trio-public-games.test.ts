import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const exported = {} as typeof import("../src/components/tournaments/public-trio-matches");
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/components/tournaments/public-trio-matches.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: exported, require: createRequire(import.meta.url) });
const { PublicTrioMatches } = exported;

const side = (prefix: string) => ({ name: `Equipe ${prefix}`, players: [1, 2, 3].map(number => ({ player: { id: `${prefix}${number}`, name: `Atleta ${prefix}${number}` } })) });
const match = { id: "encontro", label: "Grupo 1 · Jogo 1", stage: "GROUP", scheduledTime: null, courtName: null, homeScore: 1, awayScore: 1, homePair: side("A"), awayPair: side("B"), trioGames: [{ gameNumber: 1, homePlayerIds: ["A1", "A2"], awayPlayerIds: ["B1", "B2"], homeScore: 6, awayScore: 2 }, { gameNumber: 2, homePlayerIds: ["A1", "A3"], awayPlayerIds: ["B1", "B3"], homeScore: 2, awayScore: 6 }] };
test("public Trio games show the actual lineups and conditional decider without enrollment identities", () => {
  const html = renderToStaticMarkup(createElement(PublicTrioMatches, { categoryName: "Trio", matches: [match] }));
  assert.match(html, /Atleta A1 \/ Atleta A2/);
  assert.match(html, /Atleta A1 \/ Atleta A3/);
  assert.match(html, /Desempate/);
  assert.doesNotMatch(html, /CPF|telefone|thirdCpf|playerId/);
  const straight = renderToStaticMarkup(createElement(PublicTrioMatches, { categoryName: "Trio", matches: [{ ...match, homeScore: 2, awayScore: 0 }] }));
  assert.doesNotMatch(straight, /Desempate/);
  const knockout = renderToStaticMarkup(createElement(PublicTrioMatches, { categoryName: "Trio", matches: [match], knockoutOnly: true }));
  assert.doesNotMatch(knockout, /Grupo 1 · Jogo 1/);
});
