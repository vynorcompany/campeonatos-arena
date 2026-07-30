# Category schedule and pair availability report

## Result

- Added nullable `scheduledDate` storage to `CategoryMatch`, preserving the existing nullable `scheduledTime`.
- Added strict server validation for real ISO dates (`YYYY-MM-DD`) and 24-hour times (`HH:mm`), including support for clearing either value.
- Added an arena-scoped, authenticated action/service to save the schedule of one category match.
- Added date and time inputs to every category game.
- Removed athletes already assigned to a pair from both selectors only within the current category.
- Preserved the existing server-side duplicate-pair validation.

## TDD evidence

- RED: `npx tsx --test tests/category-schedule-availability.test.ts`
  - Exit 1, 3 failures for the missing schedule schema, category-local availability helper, and application wiring.
- GREEN: `npx tsx --test tests/category-schedule-availability.test.ts`
  - 3 tests passed, 0 failed.
- The existing registration UI assertion was updated from `eligibleAthletes` to `availableAthletes` because the new behavior intentionally narrows the eligible list after pair membership is considered.

## Local migration

- Confirmed `.env` points to `postgresql://localhost:5433/campeonatos_arena_dev`.
- `prisma migrate dev` made no database changes: it stopped after detecting legacy `Player` columns that its generated diff would drop.
- Added the surgical migration `20260730190000_category_match_schedule`, containing only:
  - `ALTER TABLE "CategoryMatch" ADD COLUMN "scheduledDate" TEXT;`
- Applied it with `npx prisma migrate deploy`.
- `npx prisma migrate status` reports 36 migrations and an up-to-date local database.

## Verification

- Focused test: 3 passed, 0 failed.
- Full test suite: 66 passed, 0 failed.
- `npm run typecheck`: passed.
- `npx next build`: passed, including compilation, type validation, and generation of 52 static pages.
- `node scripts/prepare-standalone.mjs`: passed.
- `git diff --check`: passed.

## Concerns

- The package wrapper `npm run build` starts with `prisma generate`. On this Windows workspace, that step cannot replace `query_engine-windows.dll.node` while two pre-existing Next development servers on ports 3001 and 3002 hold the shared Prisma engine open. Prisma did update the generated TypeScript client before the rename failed, and the direct production build passed. A clean wrapper run requires those unrelated servers to stop first.
- The local database contains legacy `Player.birthDate`, `Player.email`, `Player.notes`, and `Player.phone` columns that are absent from the current Prisma schema. This task deliberately did not drop or otherwise modify them.

## Blocking review follow-up

### Result

- Manual pair validation now rejects `player-1 + player-3` when `player-1` already belongs to `player-1 + player-2` in the same category, while preserving the dedicated duplicate-pair error.
- `CategoryPairPlayer` now stores its owning `competitionId` and enforces database uniqueness on `(competitionId, playerId)`, closing concurrent-write races beyond the friendly service precheck.
- Draft category pairs now expose a guarded remove action. Removal clears draft matches and groups before deleting the pair, forcing a consistent redraw and returning both athletes to the category-local selector options.
- Schedule validation rejects either date-only or time-only submissions. Both date and time inputs are required in the game form.

### TDD evidence

- RED: focused suite had 5 expected failures and 1 pass for the missing membership invariant, database constraint, draft removal, and paired schedule requirement.
- GREEN: focused suite passed 6 tests with 0 failures.
- Regression coverage includes `player-1 + player-3` rejected after `player-1 + player-2`, draft-only guarded removal, option restoration after membership removal, database constraint wiring, and partial schedule rejection.

### Local migration

- Confirmed zero duplicate `(competitionId, playerId)` memberships before applying the constraint.
- Applied `20260730200000_category_pair_player_competition` only to `postgresql://localhost:5433/campeonatos_arena_dev`.
- `npx prisma migrate status` reports 37 migrations and an up-to-date local database.

### Verification

- Focused test: 6 passed, 0 failed.
- Full test suite: 69 passed, 0 failed.
- `npm run typecheck`: passed.
- `npx next build`: passed, including compilation, type validation, and generation of 52 static pages.
- `node scripts/prepare-standalone.mjs`: passed.

### Remaining concern

- One pre-existing Next development server on port 3001 still holds the shared Prisma engine DLL. `prisma generate` updates generated types but cannot replace the locked binary; the direct production build remains green.
