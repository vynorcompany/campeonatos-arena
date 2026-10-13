import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("consultas das telas internas de torneios restringem jogos e pedidos médicos à arena ativa", () => {
  const games = readFileSync(new URL("../src/app/(app)/torneios/[tournamentId]/jogos/page.tsx", import.meta.url), "utf8");
  const category = readFileSync(new URL("../src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx", import.meta.url), "utf8");
  const registrations = readFileSync(new URL("../src/app/(app)/torneios/[tournamentId]/inscricoes/page.tsx", import.meta.url), "utf8");

  assert.match(games, /categoryMatch\.findMany\(\{ where: \{ competition: \{ category: \{ tournamentId, tournament: \{ arenaId: auth\.arenaId \}/);
  assert.match(category, /leagueMedicalSubstitutionRequest\.findMany\(\{\s*where: \{ status: "PENDING", pair: \{ competition: \{ categoryId: params\.categoryId, category: \{ tournamentId: params\.tournamentId, tournament: \{ arenaId: auth\.arenaId \}/);
  assert.match(registrations, /where: \{ id: params\.tournamentId, arenaId: auth\.arenaId \}/);
  assert.match(registrations, /if \(!tournament\) notFound\(\)/);
});

test("ações da chave não aceitam categoria ou jogo de outra arena", () => {
  const actions = readFileSync(new URL("../src/lib/actions/tournament.ts", import.meta.url), "utf8");
  const generate = actions.split("export async function generateCategoryBracketAction")[1]?.split("export async function updateCategoryBracketMatchScheduleAction")[0];
  const schedule = actions.split("export async function updateCategoryBracketMatchScheduleAction")[1]?.split("export async function updateTournamentCategoryFormatAction")[0];
  assert.ok(generate);
  assert.ok(schedule);
  assert.match(generate, /await withArenaTransaction\(auth\.arenaId, async \(tx\) => \{/);
  assert.match(generate, /await lockTournamentRegistrations\(tx, tournamentId, auth\.arenaId\)/);
  assert.match(generate, /tournament\.registrationPhase === "REGISTRATIONS"/);
  assert.match(generate, /FOR UPDATE OF c/);
  assert.match(generate, /const registrations = await tx\.publicTournamentRegistration\.findMany/);
  assert.match(generate, /WHERE c\."id" = \$\{categoryId\} AND c\."tournamentId" = \$\{tournamentId\} AND t\."arenaId" = \$\{auth\.arenaId\}/);
  assert.match(generate, /hasStartedCategoryBracket\(existing\.matches\)/);
  assert.match(schedule, /categoryBracketMatch\.updateMany\(\{\s*where: \{ id: matchId, bracket: \{ tournament: \{ arenaId: auth\.arenaId \} \} \}/);
  assert.match(schedule, /FOR UPDATE OF c/);
  assert.match(schedule, /if \(!updated\.count\) throw new Error/);
});
