# Public Standings Mobile Layout Implementation Plan

Goal: Make the public classification modern and readable on mobile with position cards while retaining desktop tables.

## Task 1: Responsive standing cards

Files: src/components/tournaments/public-standings.tsx; src/app/globals.css; tests/public-standings.test.ts.

- [ ] Add a failing source contract for a public-standing mobile card and its position, pair, summary, and differential fields.
- [ ] Run npx tsx --test tests/public-standings.test.ts and confirm failure.
- [ ] Render a semantic mobile-only list alongside the current desktop table. Each card contains position, pair, matches, wins, losses, and differential.
- [ ] Add responsive styles for a compact header, full-width segmented tabs, stacked filters, 44px controls, and cards below the mobile breakpoint.
- [ ] Run focused tests and typecheck.
- [ ] Run production build, commit, and push main.

