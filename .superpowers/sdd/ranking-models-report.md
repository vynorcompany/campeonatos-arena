# Task 1 — Ranking models, General Ranking and event edit

## Delivered

- Added independent ranking dimensions:
  - type: `INDIVIDUAL` or `PAIR`;
  - model: `LEAGUE` or `KNOCKOUT`.
- Added model-aware rule tables:
  - Liga: `CHAMPION`, `RUNNER_UP`, `THIRD`, `PARTICIPATION`;
  - Mata-mata: `CHAMPION`, `RUNNER_UP`, `SEMIFINAL`,
    `QUARTERFINAL`, `PARTICIPATION`.
- Ranking forms now switch the visible point inputs dynamically and persist
  `model` and `isGeneral` on create and update.
- Changing a ranking model deletes obsolete rule rows before upserting the
  selected model's rules.
- Liga placement now emits `THIRD`, so its configurable third-place points are
  actually applied.
- Category ranking links enforce model/table compatibility at creation and
  finish. A ranking model cannot be changed while incompatible categories are
  linked.
- A General Ranking must be individual. The write path uses an arena-scoped
  advisory lock and the database adds:
  - an individual-only check constraint;
  - a partial unique index allowing at most one `isGeneral = true` ranking per
    arena.
- Existing event editing continues to submit name and general metadata through
  `updateTournamentAction`; the action now explicitly revalidates the edited
  event detail route after saving.

## Migration

- Added and applied locally:
  `20260730210000_ranking_models_and_general`.
- Local datasource verified by Prisma:
  `campeonatos_arena_dev` at `localhost:5433`.
- `prisma migrate dev` could not run in the non-interactive environment and
  exited before creating a migration. The explicit migration was applied with
  `prisma migrate deploy`.
- Standard client generation hit the known shared Windows DLL lock. Type
  generation succeeded with `prisma generate --no-engine`.

## TDD evidence

- Initial RED: all 6 focused tests failed because model/general persistence,
  model-aware rules, dynamic fields, partial uniqueness and event-detail
  revalidation were absent.
- First GREEN: validators exposed the exact rule keys and rejected a pair
  Ranking Geral.
- Persistence/UI GREEN: migration, actions, dynamic form and event route
  revalidation passed 6/6.
- Review RED: Liga still classified third place as participation.
- Review GREEN: Liga now emits and awards `THIRD`.
- Compatibility RED: an already-linked ranking could still change to a model
  incompatible with its category tables.
- Compatibility GREEN: model changes are blocked while incompatible categories
  are linked.

## Verification

- `npx tsx --test tests/*.test.ts` — 82 passed, 0 failed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with only the 8 pre-existing `<img>` optimization
  warnings outside this task.
- `npx prisma validate` — schema valid.
- `npx prisma migrate status` — 38 migrations found; database schema up to
  date.
- `git diff --check` — passed.

## Preserved work

- The pre-existing untracked `.superpowers/brainstorm/` directory was not
  modified or included.

## P1 compatibility review follow-up

The review identified two historical compatibility gaps and both were fixed in
a separate follow-up migration and guarded application paths.

### League backfill

- Added and applied locally:
  `20260730211000_ranking_model_compatibility`.
- A ranking linked exclusively to `LEAGUE` category competitions is backfilled
  to `model = LEAGUE`.
- Its rule table is converted to the League shape:
  - `THIRD` is created from the previous `SEMIFINAL` value, falling back to
    `PARTICIPATION` and then zero;
  - `PARTICIPATION` moves to display order 4;
  - `SEMIFINAL` and `QUARTERFINAL` are removed.
- A ranking linked to both League and non-League categories cannot be assigned
  one truthful model. The migration raises an explicit exception before any
  mutation instead of silently breaking one consumer.
- A ranking shared by a League category and a legacy tournament is likewise
  rejected before backfill, because the legacy calculation requires knockout
  rules.

### Legacy tournament enforcement

- Both legacy ranking write guards now require
  `type = INDIVIDUAL` and `model = KNOCKOUT`.
- The new-event and existing-event ranking queries apply the same pair of
  filters, so an incompatible ranking is not offered for selection.
- Ranking editing counts linked legacy tournaments and rejects changing their
  ranking to `LEAGUE`, even when its type remains `INDIVIDUAL`.

### Follow-up TDD and verification

- RED: compatibility migration absent; both legacy selectors/guards lacked the
  model constraint; legacy-linked ranking model changes remained allowed.
- GREEN: 11/11 focused ranking tests passed.
- `npx tsx --test tests/*.test.ts` — 85 passed, 0 failed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with only the same 8 pre-existing `<img>`
  optimization warnings.
- `npx prisma migrate deploy` — compatibility migration applied successfully
  to local `campeonatos_arena_dev` at `localhost:5433`.
