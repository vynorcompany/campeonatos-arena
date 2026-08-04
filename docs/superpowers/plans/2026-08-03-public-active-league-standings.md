# Public Active League Standings Implementation Plan

Goal: Show current standings for public active League categories.

## Task 1: Expose active Leagues

Files: src/lib/services/public-standings.ts; src/lib/public-standings.ts; tests/public-standings.test.ts.

- [ ] Add a failing test proving a public PUBLISHED League is included in ranking options while a public PUBLISHED knockout is excluded.
- [ ] Run npx tsx --test tests/public-standings.test.ts and confirm failure.
- [ ] Load public finished categories plus public PUBLISHED categories whose format is LEAGUE. Pass their current completed matches to buildPublicCategoryStandings.
- [ ] Update option selection to accept finished categories and published League categories.
- [ ] Run the targeted test, npm run typecheck, and the production build.
- [ ] Commit and push main.

