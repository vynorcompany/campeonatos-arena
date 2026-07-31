# Tournament Management Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement category-first doubles tournaments with public approval, eight-pair knockout, and configurable ranking points.

**Architecture:** `Tournament` remains the event; a new optional category competition owns category registrations, pairs, groups, matches, status, ranking and General Ranking option. Pure modules calculate format, standings and qualification; server actions own validation and transactions.

**Tech Stack:** Next.js 14, TypeScript, Prisma/PostgreSQL, Zod, React server actions, `node:test` using `tsx`.

## Global Constraints

- Only doubles compete.
- Every category sets class, gender, one of `LEAGUE`, `THREE_GROUPS`, `FOUR_GROUPS`, `SIMPLE`, selected pair ranking, and optional individual General Ranking.
- Non-league starts knockout at quarterfinals with exactly eight qualifiers.
- Tie order is victories, head-to-head, then score differential.
- External entries stay pending and may create athletes on approval.
- Ranking type is `INDIVIDUAL` or `PAIR`; placement points are configurable.
- Never reprocess historical events.

## File structure

- `prisma/schema.prisma` and a migration define the category competition boundary.
- `src/lib/tournament-category/{types,draw,standings}.ts` holds pure, tested competition rules.
- `src/lib/{validators,services,actions}/category-competition.ts` holds input, database transactions, and permissions.
- `src/components/tournaments/category-*.tsx` renders focused configuration, registration, draw and result panels.
- `src/app/(app)/torneios/**` composes event list/details; `src/app/inscricao/[publicSlug]/page.tsx` is external registration.
- `tests/category-competition*.test.ts` uses the existing `node:test` convention.

---

### Task 1: Persist category competitions

**Files:** modify `prisma/schema.prisma`; create `prisma/migrations/<timestamp>_category_competition_redesign/migration.sql`; create `tests/category-competition-schema.test.ts`.

**Interfaces:** create `CompetitionFormat`, `RankingType`, `CategoryCompetition`, `CategoryPair`, `CategoryGroup`, `CategoryMatch`; retain optional `TournamentCategory.competition` so legacy records work.

- [ ] Write a failing test that asserts the schema contains `model CategoryCompetition`, `competition CategoryCompetition?`, `enum CompetitionFormat`, and `type RankingType @default(PAIR)`.
- [ ] Run `npx tsx --test tests/category-competition-schema.test.ts`; expect failure due to missing models.
- [ ] Add the enums; category class/gender; `RankingProfile.type`; `CategoryCompetition` (`categoryId` unique, `format`, `status`, optional `rankingId`, `feedsGeneralRanking`); and category-scoped pair/group/match/registration relations. Keep every legacy table/relation untouched and use cascade deletion below the category competition.
- [ ] Create the migration with `npx prisma migrate dev --name category_competition_redesign`, then run `npx prisma generate`, the schema test and `npm run typecheck`; expect pass.
- [ ] Commit: `git add prisma tests/category-competition-schema.test.ts && git commit -m "feat: add category competition data model"`.

### Task 2: Implement draw and standings rules TDD-first

**Files:** create `src/lib/tournament-category/types.ts`, `src/lib/tournament-category/draw.ts`, `src/lib/tournament-category/standings.ts`, `tests/category-competition-rules.test.ts`.

**Interfaces:** `buildGroups({ format, pairIds })`, `buildRoundRobin(pairIds)`, `rankStandings(rows, matches)`, `selectQuarterfinalists(groups)`, `buildKnockout(format, pairIds)`.

- [ ] Write failing tests for: Simple with 14 pairs returns `[4,4,3,3]`; three groups returns eight qualifiers; tied standings return order `a,b` when head-to-head resolves them; League produces `[]` knockout.
- [ ] Run `npx tsx --test tests/category-competition-rules.test.ts`; expect missing-module failure.
- [ ] Define `CompetitionFormat = "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE"` and `StandingRow = { pairId: string; victories: number; differential: number }`. Fixed formats use exactly 3/4 groups. Simple uses only groups 3/4 and size difference ≤1. Reject non-league below eight pairs. Pick top two per group and best thirds using the same full comparator until eight. Build QF/SF/final only for non-league.
- [ ] Run rule test and typecheck; expect pass. Commit: `git add src/lib/tournament-category tests/category-competition-rules.test.ts && git commit -m "feat: add category draw and standings rules"`.

### Task 3: Add lifecycle actions and ranking application

**Files:** create `src/lib/validators/category-competition.ts`, `src/lib/services/category-competition.ts`, `src/lib/actions/category-competition.ts`, `tests/category-competition-actions.test.ts`, `tests/category-ranking.test.ts`; modify `src/lib/validators/ranking.ts`, `src/lib/services/ranking.ts`, `src/components/forms/ranking-profile-form.tsx`.

**Interfaces:** actions `createCategoryCompetitionAction`, `addManualPairAction`, `generateCategoryDrawAction`, `moveCategoryPairAction`, `publishCategoryDrawAction`, `recordCategoryMatchResultAction`, `finishCategoryCompetitionAction`.

- [ ] Write failing tests that reject equal athlete IDs, require `requireModuleEdit("tournaments")`, accept `type: "PAIR"` in ranking validation, and reject `PAIR` as General Ranking target.
- [ ] Run both tests; expect failure.
- [ ] Implement protected arena-scoped transactions: manual pairs require active, different and eligible athletes and cannot duplicate a pair; generation replaces draft groups; a move clears draft matches; publishing rejects non-league unless exactly eight are qualified, then creates group games + QF/SF/final. Match result recalculates standings before winner advancement.
- [ ] Extend ranking configuration with type and placement values. A category selects only Pair ranking; its independent General Ranking flag credits each athlete individually. Finish uses champion/vice/semifinal/quarterfinal/participation values and an application record to make the transaction idempotent.
- [ ] Run tests and `npm run typecheck`; expect pass. Commit: `git add src/lib src/components/forms/ranking-profile-form.tsx tests prisma && git commit -m "feat: manage category competitions and rankings"`.

### Task 4: Replace internal tournament UI

**Files:** modify `src/components/forms/tournament-form.tsx`, `src/components/forms/tournament-category-manager-form.tsx`, `src/app/(app)/torneios/page.tsx`, `src/app/(app)/torneios/[tournamentId]/page.tsx`, `src/components/layout/nav-links.tsx`; create `src/components/tournaments/category-competition-form.tsx`, `category-registration-panel.tsx`, `category-draw-panel.tsx`, `category-results-panel.tsx`, `tests/tournament-category-ui.test.ts`.

**Interfaces:** event creation is metadata only. Details tabs are Categorias, Inscrições, Duplas e grupos, Tabela e jogos, Resultados.

- [ ] Write failing UI contracts: nav source does not contain `href: "/jogadores"`; configuration source lists all four format values.
- [ ] Run `npx tsx --test tests/tournament-category-ui.test.ts`; expect failure.
- [ ] Implement cards/panels that show class/gender, format, Pair ranking, General Ranking toggle, status and the next legal action. Use labels `Liga`, `3 grupos`, `4 grupos`, `Simples (grupos de 3 e 4)`. Remove Jogadores under Torneios, retaining Gestão → Atletas only.
- [ ] Run UI test, typecheck and build; expect pass. Commit: `git add src/components src/app/'(app)'/torneios src/components/layout/nav-links.tsx tests/tournament-category-ui.test.ts && git commit -m "feat: redesign tournament event screens"`.

### Task 5: Public entries, acceptance verification and docs

**Files:** modify `src/app/inscricao/[publicSlug]/page.tsx`, `src/lib/actions/public-registration.ts`, `src/lib/validators/public-registration.ts`, `README.md`; create `src/components/tournaments/public-category-registration-form.tsx`, `tests/public-category-registration.test.ts`.

**Interfaces:** public submit includes category ID and both athletes; approval atomically creates unknown athletes and one category pair.

- [ ] Write failing tests that require `PENDING_APPROVAL` on public submit and `prisma.player.create` in approval.
- [ ] Run `npx tsx --test tests/public-category-registration.test.ts`; expect failure.
- [ ] Present only registration-open categories publicly. Capture both athletes and allow unknown ones. Approval must create master athletes as needed, reject ineligible/inactive/duplicate pairs, and insert the category pair in one transaction. Public confirmation must expose only pending status.
- [ ] Run `npx tsx --test tests/*.test.ts; npm run typecheck; npm run build; git diff --check`; expect all pass.
- [ ] Document Super 12, Super 16, Simple, Liga, public pending approval and ranking checks. Commit: `git add src/app/inscricao src/lib/actions/public-registration.ts src/lib/validators/public-registration.ts src/components/tournaments/public-category-registration-form.tsx tests/public-category-registration.test.ts README.md && git commit -m "feat: approve public category registrations"`.
