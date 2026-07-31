# Ranking Geral, agenda pública e jogos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o Ranking de duplas controlar a alimentação do Ranking Geral, permitir editar eventos, tornar a operação de Jogos mais legível e publicar a agenda ordenada de partidas.

**Architecture:** `RankingProfile` receberá a fonte de verdade `feedsGeneralRanking`; a criação de competição lerá essa regra do ranking no servidor. Um serviço público separado transformará partidas públicas agendadas em grupos de agenda por dia, enquanto a página de classificação somente consome essa estrutura e mantém as classificações finais isoladas.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma/PostgreSQL, Zod, Node test runner via `tsx --test`.

## Global Constraints

- Trabalhar exclusivamente em `C:\Users\jefer\campeonatos-arena\.worktrees\tournament-management-implementation` e no banco local PostgreSQL da porta 5433; não tocar Railway.
- O Ranking Geral da arena é individual; somente um perfil individual pode usar `isGeneral`.
- Vários rankings de duplas podem habilitar `feedsGeneralRanking` dentro da mesma arena; cada categoria usa a tabela do ranking que selecionou para creditar o Ranking Geral individual.
- Categorias existentes preservam seu booleano persistido; novas categorias herdam o estado do ranking selecionado no servidor e não recebem chave manual no formulário.
- A agenda pública mostra somente partidas de categorias públicas, não finalizadas, com `scheduledDate` e `scheduledTime` preenchidos, no escopo da arena.
- Classificações públicas de categoria seguem restritas a competições públicas `FINISHED`.
- Não expor dados cadastrais, controles administrativos, ranking de duplas interno ou partidas de outra arena na rota pública.

---

## Estrutura de arquivos

- `prisma/schema.prisma`: persistir a regra de alimentação do Geral no perfil de ranking.
- `prisma/migrations/<timestamp>_ranking_feeds_general/migration.sql`: adicionar a coluna, restringir a combinação de tipo e preservar dados locais existentes.
- `src/lib/validators/ranking.ts`: validar o novo campo e a incompatibilidade com ranking individual.
- `src/lib/actions/tournament.ts`: aceitar o campo no create/update de ranking e resolver a regra de categoria no servidor.
- `src/lib/services/category-competition.ts`: carregar o ranking pertencente à arena ao criar a competição.
- `src/components/forms/ranking-profile-form.tsx`: controlar o checkbox visual do ranking de duplas.
- `src/components/tournaments/category-competition-form.tsx`: remover o checkbox manual e apresentar o estado herdado.
- `src/components/tournaments/tournament-event-edit-form.tsx`: formulário focado de nome/descrição do evento.
- `src/app/(app)/torneios/[tournamentId]/page.tsx`: disponibilizar a ação de edição no detalhe do evento.
- `src/components/tournaments/category-results-panel.tsx` e `src/app/globals.css`: remover o atalho de classificação e aplicar linhas compactas de jogo.
- `src/lib/public-standings.ts`: tipos e conversor puro da agenda pública.
- `src/lib/services/public-standings.ts`: consultar e anexar a agenda pública com escopo de arena.
- `src/components/tournaments/public-standings.tsx`: renderizar agenda agrupada por dia.
- `tests/ranking-general-feed.test.ts`, `tests/tournament-event-edit.test.ts`, `tests/public-game-agenda.test.ts`: cobertura comportamental/pura do novo fluxo.

## Task 1: Regra de alimentação do Ranking Geral

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_ranking_feeds_general/migration.sql`
- Modify: `src/lib/validators/ranking.ts`
- Modify: `src/lib/actions/tournament.ts`
- Modify: `src/lib/services/category-competition.ts`
- Modify: `src/components/forms/ranking-profile-form.tsx`
- Modify: `src/components/tournaments/category-competition-form.tsx`
- Create: `tests/ranking-general-feed.test.ts`

**Interfaces:**
- Consumes: `RankingProfile.type`, `RankingProfile.isGeneral`, `CategoryCompetition.feedsGeneralRanking`.
- Produces: `RankingProfile.feedsGeneralRanking: boolean`; `resolveCompetitionRankingSettings(arenaId, rankingId): Promise<{ rankingId: string | null; feedsGeneralRanking: boolean }>`.

- [ ] **Step 1: Escrever testes que falham para a regra do ranking**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createRankingProfileSchema } from "@/lib/validators/ranking";

test("aceita alimentação do Geral somente para ranking de duplas", () => {
  assert.equal(createRankingProfileSchema.safeParse({
    name: "Liga A", type: "PAIR", model: "LEAGUE", feedsGeneralRanking: true,
    championPoints: 10, runnerUpPoints: 8, thirdPoints: 6, participationPoints: 2,
  }).success, true);

  assert.equal(createRankingProfileSchema.safeParse({
    name: "Geral", type: "INDIVIDUAL", model: "KNOCKOUT", feedsGeneralRanking: true,
    championPoints: 10, runnerUpPoints: 8, semifinalPoints: 6, quarterfinalPoints: 4, participationPoints: 2,
  }).success, false);
});
```

- [ ] **Step 2: Executar o teste para confirmar a falha**

Run: `npx tsx --test tests/ranking-general-feed.test.ts`

Expected: FAIL porque `feedsGeneralRanking` ainda não existe no schema/validator.

- [ ] **Step 3: Adicionar modelo, migration e validação mínima**

```prisma
model RankingProfile {
  // campos existentes
  feedsGeneralRanking Boolean @default(false)
}
```

```ts
// createRankingProfileSchema
feedsGeneralRanking: z.boolean().default(false),

if (ranking.feedsGeneralRanking && ranking.type !== "PAIR") {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["feedsGeneralRanking"],
    message: "Apenas um ranking de duplas pode alimentar o Ranking Geral.",
  });
}
```

Create an additive migration that adds `"feedsGeneralRanking" BOOLEAN NOT NULL DEFAULT false`; do not add a unique index because multiple pair rankings can feed the General Ranking. Backfill only a ranking whose active category competitions all have `feedsGeneralRanking = true`. Leave mixed historical consumers unchanged so their persisted competition result is preserved.

- [ ] **Step 4: Resolver a regra somente no servidor**

```ts
export async function resolveCompetitionRankingSettings(arenaId: string, rankingId?: string) {
  if (!rankingId) return { rankingId: null, feedsGeneralRanking: false };
  const ranking = await prisma.rankingProfile.findFirst({
    where: { id: rankingId, arenaId, active: true, type: "PAIR" },
    select: { id: true, feedsGeneralRanking: true },
  });
  if (!ranking) throw new Error("Ranking de duplas inválido para esta arena.");
  return { rankingId: ranking.id, feedsGeneralRanking: ranking.feedsGeneralRanking };
}
```

Use this return value in `createCategoryCompetition` instead of trusting `feedsGeneralRanking` from `FormData`. In ranking create/update actions, parse `formData.get("feedsGeneralRanking") === "on"`; allow multiple pair rankings enabled in the same arena.

- [ ] **Step 5: Ajustar os formulários**

Add a controlled checkbox below the model selector in `RankingProfileFields`; clear it whenever `type !== "PAIR"`. Remove the category `feedsGeneralRanking` input and replace it with explanatory copy: `"O Ranking Geral será alimentado conforme a configuração do ranking selecionado."`

- [ ] **Step 6: Executar validação e aplicar somente no banco local**

Run: `npx tsx --test tests/ranking-general-feed.test.ts && npx prisma migrate dev --name ranking_feeds_general && npm run typecheck`

Expected: tests pass, migration applies to `campeonatos_arena_dev`, typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add prisma src/lib/validators/ranking.ts src/lib/actions/tournament.ts src/lib/services/category-competition.ts src/components/forms/ranking-profile-form.tsx src/components/tournaments/category-competition-form.tsx tests/ranking-general-feed.test.ts
git commit -m "feat: configure rankings that feed the general ranking"
```

## Task 2: Edição do evento e leitura compacta de Jogos

**Files:**
- Create: `src/components/tournaments/tournament-event-edit-form.tsx`
- Modify: `src/app/(app)/torneios/[tournamentId]/page.tsx`
- Modify: `src/lib/actions/tournament.ts`
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/tournament-event-edit.test.ts`

**Interfaces:**
- Consumes: `updateTournamentAction` e o evento arena-scoped.
- Produces: formulário de edição de evento e linhas `.category-game-row` para partidas.

- [ ] **Step 1: Escrever testes que falham para edição e remoção de atalho**

```ts
test("edição de evento envia somente id, nome e descrição", () => {
  const source = readFileSync("src/components/tournaments/tournament-event-edit-form.tsx", "utf8");
  assert.match(source, /name="name"/);
  assert.match(source, /name="description"/);
  assert.match(source, /updateTournamentAction/);
});

test("jogos não oferece atalho para classificação completa", () => {
  const source = readFileSync("src/components/tournaments/category-results-panel.tsx", "utf8");
  assert.doesNotMatch(source, /Ver classificação completa/);
});
```

- [ ] **Step 2: Executar para confirmar a falha**

Run: `npx tsx --test tests/tournament-event-edit.test.ts`

Expected: FAIL porque o formulário focado ainda não existe.

- [ ] **Step 3: Criar formulário e incluí-lo no detalhe**

```tsx
export function TournamentEventEditForm({ tournament }: { tournament: { id: string; name: string; description: string } }) {
  return <form action={updateTournamentAction} className="grid-form">
    <input type="hidden" name="tournamentId" value={tournament.id} />
    <div className="field"><label htmlFor="event-name">Nome</label><input id="event-name" name="name" defaultValue={tournament.name} required /></div>
    <div className="field form-full"><label htmlFor="event-description">Descrição</label><textarea id="event-description" name="description" defaultValue={tournament.description} /></div>
    <SubmitButton label="Salvar evento" pendingLabel="Salvando..." className="button button-primary" />
  </form>;
}
```

Expose it from a discreet `Editar evento` action in the event details. Reuse the server action’s existing arena ownership check; do not expose public slug, registration, ranking or tournament lifecycle controls in this focused form.

- [ ] **Step 4: Reorganizar a lista de partidas**

Replace each broad `simple-item` in games mode with a `.category-game-row` that has five visual zones: date/time, group/stage and label, pairs, score/status, and compact schedule/result forms. Use CSS grid with a single-column mobile fallback; remove every `Ver classificação completa` control if found in this flow.

- [ ] **Step 5: Executar testes e typecheck**

Run: `npx tsx --test tests/tournament-event-edit.test.ts && npm run typecheck`

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/'(app)'/torneios/'[tournamentId]'/page.tsx src/components/tournaments/tournament-event-edit-form.tsx src/components/tournaments/category-results-panel.tsx src/lib/actions/tournament.ts src/app/globals.css tests/tournament-event-edit.test.ts
git commit -m "feat: edit events and refine category games"
```

## Task 3: Agenda pública de partidas

**Files:**
- Modify: `src/lib/public-standings.ts`
- Modify: `src/lib/services/public-standings.ts`
- Modify: `src/components/tournaments/public-standings.tsx`
- Create: `tests/public-game-agenda.test.ts`

**Interfaces:**
- Consumes: `CategoryCompetition.isPublic`, `CategoryCompetition.status`, `CategoryMatch.scheduledDate`, `CategoryMatch.scheduledTime` and pair names.
- Produces: `buildPublicGameAgenda(matches): PublicGameDay[]` and `ArenaPublicStandings.upcomingGames`.

- [ ] **Step 1: Escrever testes puros que falham para agrupamento e filtro**

```ts
test("agrupa jogos públicos por dia e ordena por horário", () => {
  const agenda = buildPublicGameAgenda([
    { eventName: "Open", categoryName: "5ª M", label: "Jogo 2", stage: "GROUP", scheduledDate: "2026-08-02", scheduledTime: "20:00", homePairName: "B", awayPairName: "C" },
    { eventName: "Open", categoryName: "5ª M", label: "Jogo 1", stage: "GROUP", scheduledDate: "2026-08-02", scheduledTime: "18:00", homePairName: "A", awayPairName: "D" },
  ]);
  assert.deepEqual(agenda[0].games.map((game) => game.scheduledTime), ["18:00", "20:00"]);
});

test("ignora jogo finalizado ou sem agendamento completo", () => {
  assert.equal(buildPublicGameAgenda([finishedGame, missingTimeGame]).length, 0);
});
```

- [ ] **Step 2: Executar para confirmar a falha**

Run: `npx tsx --test tests/public-game-agenda.test.ts`

Expected: FAIL porque `buildPublicGameAgenda` ainda não existe.

- [ ] **Step 3: Criar tipos e conversor puro**

```ts
export type PublicGameDay = {
  date: string;
  label: string;
  games: Array<{ eventName: string; categoryName: string; label: string; stage: string; scheduledTime: string; homePairName: string; awayPairName: string }>;
};

export function buildPublicGameAgenda(matches: PublicGameSource[]): PublicGameDay[] {
  const visible = matches.filter((match) => match.scheduledDate && match.scheduledTime && !match.finished);
  // sort by ISO date, time, event, category, roundOrder; group by scheduledDate
}
```

Format `label` with `Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" })` from an ISO date constructed at local noon, avoiding timezone day shifts.

- [ ] **Step 4: Consultar somente a agenda autorizada**

Extend `getArenaPublicStandings` with a separate `prisma.categoryCompetition.findMany`:

```ts
where: {
  isPublic: true,
  status: { not: "FINISHED" },
  category: { tournament: { arenaId: arena.id } },
  matches: { some: { scheduledDate: { not: null }, scheduledTime: { not: null }, winnerPairId: null } },
}
```

Select only names, stage, label, ordering values, date/time and pair names. Map these records to `buildPublicGameAgenda` and return `upcomingGames` independently of the selected standings option.

- [ ] **Step 5: Renderizar a agenda abaixo da classificação**

Add a `Próximos jogos` section after selected standings. Render each `PublicGameDay` with a day heading and concise game rows: time, event/category, stage when nonempty, and `homePairName × awayPairName`. Render `Nenhum jogo agendado.` when `upcomingGames` is empty; never add administration links or match result controls.

- [ ] **Step 6: Executar verificação completa**

Run: `npx tsx --test tests/public-game-agenda.test.ts && npx tsx --test tests/*.test.ts && npm run typecheck && npm run build`

Expected: all tests pass, typecheck and build exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/public-standings.ts src/lib/services/public-standings.ts src/components/tournaments/public-standings.tsx tests/public-game-agenda.test.ts
git commit -m "feat: publish upcoming category games"
```

## Task 4: Revisão de integração e servidor local

**Files:**
- Modify only if a defect is found by review; otherwise no production files.

**Interfaces:**
- Consumes: commits from Tasks 1–3.
- Produces: branch verificada no servidor local.

- [ ] **Step 1: Fazer revisão independente dos diffs e da autorização**

Review arena scoping, category visibility/status filters, general-ranking uniqueness, cross-category isolation, and that a malicious form value cannot force General Ranking points.

- [ ] **Step 2: Corrigir apenas achados críticos/importantes com teste de regressão**

Run: `npx tsx --test tests/*.test.ts && npm run typecheck && npm run build`

Expected: all commands exit 0 after each correction.

- [ ] **Step 3: Reiniciar o servidor de desenvolvimento limpo e verificar HTTP**

Stop only the known local Next dev process for this worktree. Move the generated `.next` cache aside recoverably if it is inconsistent, then start `npm run dev -- -p 3005`.

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/login` and `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/classificacao/sua-arena`.

Expected: both return HTTP 200 and the login HTML references a CSS asset that also returns HTTP 200.

- [ ] **Step 4: Reportar o link local e as credenciais já existentes**

Report `http://127.0.0.1:3005`, the public classification URL and the local login without changing Railway.
