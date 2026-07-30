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
