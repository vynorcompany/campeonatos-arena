# Public Standings Brand and Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved blue brand header and completed-game results to the public standings page.

**Architecture:** Extend the public games projection with the existing match score and set fields, then render them only when a public game is finished. Keep score formatting in the public standings component and give the header/game cards scoped visual styles in `globals.css`.

**Tech Stack:** Next.js, TypeScript, Prisma, Node test runner, CSS.

## Global Constraints

- Use the approved Option 1 full-width blue gradient header with the white logo above the title.
- Completed League games show a final score and available sets in game 1, 2, 3 order.
- Completed knockout games show the final score and only show sets when stored.
- Scheduled and live games do not show a final score.
- Do not expose unpublished categories or private games.

---

### Task 1: Expose completed-game result data safely

**Files:**
- Modify: `src/lib/services/public-standings.ts`
- Modify: `src/lib/public-standings.ts`
- Test: `tests/public-standings.test.ts`

- [ ] Add a failing contract asserting public games carry final score and optional ordered set values.
- [ ] Select `homeScore`, `awayScore`, `homeSet1Score`, `awaySet1Score`, `homeSet2Score`, `awaySet2Score`, `homeSet3Score`, and `awaySet3Score` with the existing public match projection.
- [ ] Map result data only onto finished public game records and run `npx tsx --test tests/public-standings.test.ts` until green.

### Task 2: Render completed-game results and branded header

**Files:**
- Modify: `src/components/tournaments/public-standings.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/public-standings.test.ts`

- [ ] Add failing source contracts for the blue header class and completed-score markup.
- [ ] Render a blue gradient header band with logo, title, and support copy.
- [ ] Render the score and optional ordered set line only for `FINISHED` games, preserving scheduled/live presentation.
- [ ] Add responsive styles for score rows and the header, then run the public standings test.

### Task 3: Verify and publish

- [ ] Run `npx tsx --test tests/public-standings.test.ts`, `npm run typecheck`, the production build, and `node scripts/prepare-standalone.mjs`.
- [ ] Inspect the public page at desktop and mobile widths.
- [ ] Commit and push `main` after all validations pass.
