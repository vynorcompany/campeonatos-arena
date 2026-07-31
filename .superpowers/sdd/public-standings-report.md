# Task 2 — Category public visibility and unified external standings

## Delivered

- Added `CategoryCompetition.isPublic` with a safe `false` default and a local
  additive migration.
- Category creation can opt into public visibility, and configured categories
  expose a guarded visibility toggle in the dedicated admin workspace.
- The visibility server action requires tournament edit access; the service
  repeats arena ownership validation inside a serializable transaction.
- Added one public arena route:
  `/classificacao/[arenaSlug]`.
- The public selector contains only:
  - the active individual Ranking Geral configured for the arena;
  - categories marked public whose competition status is `FINISHED`.
- Category option labels and category views include their event name.
- Category results are sports-only:
  - Liga reuses the canonical standings/tie-break calculation;
  - knockout formats expose champion and runner-up from the final placement;
  - internal ranking totals, registrations and administrative controls are not
    part of the public read model.
- Invalid selector values are resolved against the public allowlist and fall
  back to the first available public option.

## Migration

- Added and applied only to the local datasource:
  `20260730220000_category_public_visibility`.
- Datasource verified as `campeonatos_arena_dev` at `localhost:5433`.
- `prisma migrate dev --skip-generate` applied the migration, then exited in
  non-interactive mode after reporting legacy `Player` column drift. It did not
  execute the proposed drift changes.
- A fresh `npx prisma migrate status` reports 40 migrations and:
  `Database schema is up to date!`
- `npx prisma validate` reports a valid schema.

## TDD evidence

- Initial RED: the focused suite failed because the public standings module did
  not exist.
- Filtering GREEN: tests proved that private or unfinished categories are
  omitted, event names are present in labels, and Ranking Geral is included
  only when configured as active and individual.
- Sports RED: new Liga and knockout behavior tests failed because
  `buildPublicCategoryStandings` did not exist.
- Sports GREEN: Liga standings expose only sports statistics and knockout
  placement exposes champion/runner-up without internal ranking points.
- Source contracts cover schema/migration wiring, guarded admin action, public
  route, selector, public query boundary and absence of admin controls.

## Verification

- `npx tsx --test tests/public-standings.test.ts` — 6 passed, 0 failed.
- `npx tsx --test tests/*.test.ts` — 91 passed, 0 failed.
- `npm run typecheck` — passed.
- `npm run build` — exited 0; the route
  `/classificacao/[arenaSlug]` is present in the production route manifest.
- `npx eslint --no-eslintrc --config .eslintrc.json <changed files>` —
  0 errors and one `<img>` optimization warning for the arena logo.
- The normal Next lint integration is affected by the existing nested-worktree
  conflict between the two resolved `@next/next` plugin instances; no lint
  configuration was changed outside Task 2.
- `git diff --check` — passed.

## Independent review

- Verdict: ready to merge.
- Critical findings: none.
- Important findings: none.
- The reviewer confirmed arena scoping, the public allowlist, invalid selector
  fallback, sports-only projection, additive migration safety and authorization
  defense in depth.
- Minor follow-up recommendation: add a future Prisma-backed or dependency-
  injected service integration test for cross-arena and malicious-selector
  cases. Current tests execute the pure filtering and sports calculations and
  inspect the database query boundary.

## Preserved work

- The pre-existing untracked `.superpowers/brainstorm/` directory was not
  modified or included.
