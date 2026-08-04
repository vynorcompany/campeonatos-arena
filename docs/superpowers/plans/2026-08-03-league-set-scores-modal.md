# League Set Scores Modal Implementation Plan

Goal: Store three set scores for League matches and edit them in a responsive dialog.

Architecture: Add six nullable set-score columns to CategoryMatch. A League-only validation/action calculates the winner from two won sets while keeping aggregate scores for standings. A client dialog replaces inline League result inputs; knockout remains unchanged.

## Task 1: Storage and set validation

Files: prisma/schema.prisma; a new Prisma migration; src/lib/validators/category-competition.ts; tests/category-league-set-score.test.ts.

- [ ] Write failing tests for a 2-to-0 result, a 2-to-1 result, tied set scores, missing second set, and incomplete third set.
- [ ] Run: npx tsx --test tests/category-league-set-score.test.ts. Expected: FAIL because the League schema does not exist.
- [ ] Add nullable homeSet1, awaySet1, homeSet2, awaySet2, homeSet3, awaySet3 columns and the Zod validator. The validator accepts a blank third set only for a two-set victory and requires exactly one pair to win two sets.
- [ ] Re-run the test. Expected: PASS.
- [ ] Commit: feat: validate league match set scores.

## Task 2: Guarded League result persistence

Files: src/lib/actions/category-competition.ts; src/lib/services/category-competition.ts; src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx; tests/category-league-set-score.test.ts.

- [ ] Write failing source contracts for recordCategoryLeagueMatchResultAction, all six selected set fields, and a service update containing them.
- [ ] Run the targeted test. Expected: FAIL.
- [ ] Add a tournament-authorized League action. The service confirms arena ownership and League format, derives the winner from set wins, stores all set values, preserves aggregate homeScore/awayScore as sets won, and marks the existing result finished. Do not alter knockout result handling.
- [ ] Re-run the targeted test. Expected: PASS.
- [ ] Commit: feat: save league results by set.

## Task 3: Responsive League result dialog

Files: src/components/tournaments/league-match-result-dialog.tsx; src/components/tournaments/category-results-panel.tsx; src/app/globals.css; tests/category-league-set-score.test.ts.

- [ ] Write failing contracts for dialog role, Set 1, Set 2, Set 3, and LeagueMatchResultDialog rendered from the game panel.
- [ ] Run the targeted test. Expected: FAIL.
- [ ] Create a client dialog with backdrop, focusable close/cancel actions, pair-name rows, three proportional set columns, save action, and mobile layout. Make League game cards open it while schedule/status controls retain their own behavior. Render a compact set summary in each game card.
- [ ] Re-run the targeted test. Expected: PASS.
- [ ] Commit: feat: edit league set scores in dialog.

## Task 4: Verification and deployment

- [ ] Run: npx tsx --test tests/category-league-set-score.test.ts tests/category-schedule-availability.test.ts tests/public-standings.test.ts. Expected: all PASS.
- [ ] Run: npm run typecheck. Expected: exit code 0.
- [ ] Run: node --env-file=C:\Users\jefer\campeonatos-arena\.worktrees\tournament-management-implementation\.env node_modules\next\dist\bin\next build. Expected: exit code 0.
- [ ] Run: node scripts\prepare-standalone.mjs then git push origin main.
