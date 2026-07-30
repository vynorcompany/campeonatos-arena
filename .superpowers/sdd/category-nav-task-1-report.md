# Task 1 report — category values and athlete selection

## Delivered

- Added `CATEGORY_CLASS_OPTIONS` with the five supported classes: `3ª`, `4ª`, `5ª`, `6ª`, and `7ª`.
- Replaced the free-text category class control with an options-backed select and limited category genders to Feminino and Masculino.
- Enforced the same class/gender contract in the category-competition validator. Existing title-case gender submissions are normalized to the canonical stored values.
- Normalized ordinal classes in eligibility checks, so `5`, `5a`, and `5ª` are equivalent.
- Kept the service-level protections for distinct athletes and duplicate pairs intact.
- Made the registration panel itself exclude inactive athletes, and added the active field to its page query.
- When fewer than two eligible athletes are available, the disabled registration form now links directly to **Gestão → Atletas** (`/players`).

## Test-first evidence

The focused tests were added before implementation and initially failed because the options module, category selectors, registration link, and normalized ordinal handling did not yet exist. The first focused run ended with the expected missing-module and assertion failures.

After the minimal implementation, the focused suite passed. A final active-athlete regression assertion was then added, observed failing, and passed after the panel-local filter was added.

## Verification

- `npx tsx --test tests/category-competition-actions.test.ts tests/tournament-category-ui.test.ts` — 25 passed, 0 failed.
- `npm run typecheck` — completed successfully.
- `git diff --check` — completed successfully.

## Scope and concerns

No database migration is needed: the existing category fields retain their storage shape while new submissions are constrained at the form and validator boundaries. Legacy class spellings remain eligible for existing athlete records; only newly configured category values are restricted to the approved set.
