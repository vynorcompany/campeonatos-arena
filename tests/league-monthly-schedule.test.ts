import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks, getLeagueMatchBlock } from "@/lib/league/monthly-schedule";

test("Liga divides its monthly calendar into the four fixed blocks", () => {
  assert.deepEqual(getLeagueMonthBlocks(2026, 2), [
    { number: 1, startsOn: "2026-02-01", endsOn: "2026-02-07" },
    { number: 2, startsOn: "2026-02-08", endsOn: "2026-02-14" },
    { number: 3, startsOn: "2026-02-15", endsOn: "2026-02-21" },
    { number: 4, startsOn: "2026-02-22", endsOn: "2026-02-28" },
  ]);
});

test("Liga distributes round-robin matches and home responsibilities fairly across four blocks", () => {
  const schedule = buildMonthlyLeagueSchedule(["A", "B", "C", "D", "E", "F"]);
  const homeGames = new Map<string, number>();
  for (const match of schedule.matches) homeGames.set(match.homePairId, (homeGames.get(match.homePairId) ?? 0) + 1);

  assert.equal(schedule.matches.length, 15);
  assert.deepEqual(schedule.blockCounts, [4, 4, 4, 3]);
  assert.ok(Math.max(...homeGames.values()) - Math.min(...homeGames.values()) <= 1);
  assert.deepEqual(new Set(schedule.matches.map((match) => match.blockNumber)), new Set([1, 2, 3, 4]));
});

test("Liga keeps home duties balanced with an odd number of pairs", () => {
  const schedule = buildMonthlyLeagueSchedule(["A", "B", "C", "D", "E"]);
  const homes = new Map<string, number>();
  for (const match of schedule.matches) homes.set(match.homePairId, (homes.get(match.homePairId) ?? 0) + 1);
  assert.equal(schedule.matches.length, 10);
  assert.ok(Math.max(...homes.values()) - Math.min(...homes.values()) <= 1);
});

test("legacy League matches receive a stable weekly block from their round", () => {
  assert.equal(getLeagueMatchBlock({ leagueBlock: null, roundOrder: 1 }), 1);
  assert.equal(getLeagueMatchBlock({ leagueBlock: null, roundOrder: 4 }), 4);
  assert.equal(getLeagueMatchBlock({ leagueBlock: null, roundOrder: 5 }), 1);
  assert.equal(getLeagueMatchBlock({ leagueBlock: 3, roundOrder: 1 }), 3);
});

test("schema keeps monthly League cycles, proposals and medical substitution requests isolated", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(schema, /model LeagueCycle/);
  assert.match(schema, /model LeagueMatchProposal/);
  assert.match(schema, /model LeagueMedicalSubstitutionRequest/);
  assert.match(schema, /leagueCycleId\s+String\?/);
  assert.match(schema, /leagueBlock\s+Int\?/);
});

test("publishing a Liga uses the monthly schedule engine and persists its cycle", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/category-competition.ts"), "utf8");

  assert.match(service, /buildMonthlyLeagueSchedule/);
  assert.match(service, /leagueCycle\.upsert/);
  assert.match(service, /leagueBlock:/);
});

test("league proposals enforce host ownership, three attempts and response deadlines", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/league-challenges.ts"), "utf8");

  assert.match(actions, /homePairId !== proposer\.id/);
  assert.match(actions, /proposalCount >= 3/);
  assert.match(actions, /leagueMatchProposal/);
  assert.match(actions, /responseDueAt/);
});

test("monthly closing resolves deadlines, W.O. and opens the next cycle", () => {
  const lifecycle = readFileSync(resolve(process.cwd(), "src/lib/league/lifecycle.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(lifecycle, /HOST_NO_PROPOSAL/);
  assert.match(lifecycle, /VISITOR_NO_RESPONSE/);
  assert.match(lifecycle, /DOUBLE_WO/);
  assert.match(lifecycle, /createMonthlyCycle/);
  assert.match(lifecycle, /applyPromotionAndRelegation/);
  assert.match(lifecycle, /snapshotLeagueCycle/);
  assert.match(lifecycle, /resetLeagueCompetition/);
  assert.match(schema, /snapshot\s+Json\?/);
});

test("arena can close the current League cycle manually without waiting for the next month", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/category-competition.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");
  const lifecycle = readFileSync(resolve(process.cwd(), "src/lib/league/lifecycle.ts"), "utf8");
  assert.match(actions, /runLeagueLifecycleAction/);
  assert.match(actions, /closeLeagueCycleManually/);
  assert.match(lifecycle, /export async function closeLeagueCycleManually/);
  assert.match(page, /Processar ciclo da Liga/);
  assert.match(page, /name="competitionId"/);
});

test("athlete portal exposes the main modules and League submenus", () => {
  const view = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const leaguePortal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  assert.match(view, /Portal do Atleta/);
  assert.match(view, /Grade de horários/);
  assert.match(view, /Minhas reservas/);
  assert.match(view, /Premiação/);
  assert.match(view, /portal-league-prize-podium/);
  assert.match(view, /section === "booking"/);
  assert.match(view, /PublicBookingContent/);
  assert.match(view, /Escolha um professor para ver as turmas disponíveis/);
  assert.match(view, /teacherId/);
  assert.match(leaguePortal, /Sugerir horário para este jogo/);
  assert.match(leaguePortal, /Reserva confirmada/);
});

test("portal classes are available by teacher instead of a student plan", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");
  const view = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  assert.match(portal, /tx\.teacher\.findMany/);
  assert.match(view, /Encontre sua turma/);
  assert.doesNotMatch(view, /Seu plano de aulas/);
});

test("event rules use a spacious editor and category management only lives in quick actions", () => {
  const editor = readFileSync(resolve(process.cwd(), "src/components/tournaments/tournament-event-edit-form.tsx"), "utf8");
  const eventPage = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/page.tsx"), "utf8");
  assert.match(editor, /id="event-rules"[\s\S]*rows=\{12\}/);
  assert.match(editor, /className="event-rules-editor"/);
  assert.doesNotMatch(eventPage, /id="gerenciar-categorias"/);
});

test("League management keeps the prize controls compact and category add opens the category modal", () => {
  const categoryPage = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");
  const categoryList = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-list.tsx"), "utf8");
  const quickActions = readFileSync(resolve(process.cwd(), "src/components/tournaments/event-quick-actions.tsx"), "utf8");

  assert.match(categoryPage, /league-overview-bottom/);
  assert.match(categoryPage, /league-prize-editor/);
  assert.match(categoryList, /\?action=categories/);
  assert.match(quickActions, /initialAction/);
});

test("League games render their existing fixtures in four visual weekly blocks", () => {
  const games = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-results-panel.tsx"), "utf8");
  assert.match(games, /getLeagueMatchBlock/);
  assert.match(games, /league-week-divider/);
  assert.match(games, /Semana \{leagueBlock\}/);
});

test("a published League can return to editing only before a game is started", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/category-competition.ts"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/category-competition.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-draw-panel.tsx"), "utf8");

  assert.match(actions, /reopenCategoryLeagueForEditingAction/);
  assert.match(service, /reopenCategoryLeagueForEditing/);
  assert.match(service, /manualStatus: \{ in: \["LIVE", "FINISHED"\] \}/);
  assert.match(page, /Voltar para edição/);
});

test("athlete portal groups League fixtures by week and shows the date range", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");

  assert.match(portal, /leagueResultsByWeek/);
  assert.match(portal, /Período: \{week\.period\}/);
  assert.match(service, /period:/);
});

test("confirmed League reservations are integrated into the match title", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  assert.match(portal, /public-challenge-title-row/);
  assert.match(portal, /public-league-reservation-status/);
});

test("portal reservation confirmations use their own compact notification treatment", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  assert.match(portal, /public-portal-notification-reservation/);
  assert.match(portal, /public-portal-notification-icon/);
});

test("Liga persists athlete eligibility by modality and keeps a tier history", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const lifecycle = readFileSync(resolve(process.cwd(), "src/lib/league/lifecycle.ts"), "utf8");

  assert.match(schema, /model LeagueAthleteTier/);
  assert.match(schema, /modality\s+String/);
  assert.match(schema, /tier\s+String/);
  assert.match(schema, /leagueAthleteTiers\s+LeagueAthleteTier\[\]/);
  assert.match(lifecycle, /syncLeagueAthleteTiers/);
});

test("client profile can set the athlete's Liga A or B eligibility", () => {
  const clientEditor = readFileSync(resolve(process.cwd(), "src/components/players/client-management-workspace.tsx"), "utf8");
  const playerAction = readFileSync(resolve(process.cwd(), "src/lib/actions/tournament.ts"), "utf8");
  const playerPage = readFileSync(resolve(process.cwd(), "src/app/(app)/jogadores/page.tsx"), "utf8");

  assert.match(clientEditor, /Liga do atleta/);
  assert.match(clientEditor, /name="leagueTier"/);
  assert.match(playerAction, /leagueAthleteTier/);
  assert.match(playerPage, /leagueAthleteTiers/);
});

test("Liga workspace exposes category editing and a monthly history tab", () => {
  const tabs = readFileSync(resolve(process.cwd(), "src/components/tournaments/tournament-tabs.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");

  assert.match(tabs, /Histórico/);
  assert.match(page, /LeagueCategorySettingsDialog/);
  assert.match(page, /LeagueHistoryPanel/);
  assert.match(page, /league-overview-bottom/);
});

test("athlete portal keeps ordinary reservations out of League notifications", () => {
  const portalService = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");

  assert.match(portalService, /type:\s*"LEAGUE_MATCH"/);
  assert.match(portal, /leagueNotifications/);
  assert.doesNotMatch(portal, /isReservationConfirmation/);
});
