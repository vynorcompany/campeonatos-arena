# Public Standings Header Controls Implementation Plan

Goal: Modernize the public header, tabs, and filters without changing approved standings cards.

## Task 1: Editorial header and controls

Files: src/components/tournaments/public-standings.tsx; src/app/globals.css; tests/public-standings.test.ts.

- [ ] Add a failing source contract for editorial tab classes and the filter card structure.
- [ ] Run npx tsx --test tests/public-standings.test.ts and confirm failure.
- [ ] Add component class names for the header content, brand mark, and filter labels. Keep queries and data unchanged.
- [ ] Replace the outer tab capsule with an underline navigation. Refine desktop/mobile spacing, logo dimensions, text width, select styling, and touch targets in CSS.
- [ ] Run targeted tests, typecheck, build, commit, and push main.

