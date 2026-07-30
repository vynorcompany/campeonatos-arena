# Results versus ranking report

## Delivered

- Results now show Liga standings with position, pair, matches, wins, losses,
  and differential, using the existing victories/head-to-head/differential
  ordering rule.
- Results for knockout formats show only the final sports placement (champion
  and runner-up) once the final is complete.
- Removed category-result ranking configuration and point displays. Finishing
  a category still invokes the unchanged ranking application flow; ranking
  points remain on the Ranking screens.

## TDD evidence

- RED: `npx tsx --test tests/results-versus-ranking.test.ts` failed because
  Liga headers and the route standings data were absent.
- GREEN: the focused test passed 2/2 after the route and panel changes.

## Verification

- `npx tsx --test tests/*.test.ts` — 71 passed, 0 failed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.
- `npm run build` — blocked before Next.js by Prisma's external Windows file
  lock while renaming `query_engine-windows.dll.node` in the shared
  `node_modules/.prisma/client` directory (`EPERM`).
