# Public Standings Desktop Composition Implementation Plan

**Goal:** Align the desktop brand header and Ranking filter without changing mobile behavior.

1. Add source-contract coverage in `tests/public-standings.test.ts` for the desktop lockup class and one-row filter.
2. Update `src/components/tournaments/public-standings.tsx` with a logo/title lockup wrapper.
3. Update `src/app/globals.css` with desktop horizontal alignment, 260 px proportional logo width, and single-row filter grid; preserve the existing mobile stack.
4. Run the public standings test, typecheck, production build, commit, and push `main`.
