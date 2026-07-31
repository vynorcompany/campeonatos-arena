# Category Athlete Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Arena operators select two existing active athletes and add their pair to a tournament category.

**Architecture:** A Prisma migration will add contact data to the master athlete record. Athlete create and edit forms will maintain those fields. The participant form will receive category and athlete selection data, submit athlete IDs, and the server action will resolve eligible athletes inside the authenticated Arena before creating the category registration.

**Tech Stack:** Next.js 14 Server Actions, React, TypeScript, Prisma, Zod, `node:test` via `tsx`.

## Global Constraints

- Only athletes with `Player.active === true`, complete contact data, and belonging to the authenticated Arena can be selected.
- A pair must contain two different athletes.
- The change must keep the existing `PublicTournamentRegistration` and category bracket flow intact.
- Resetting points and changing athlete status are explicitly outside this plan.

---

### Task 1: Connect the master athlete list to manual category registrations

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260731120000_add_player_registration_details/migration.sql`
- Modify: `src/components/forms/player-form.tsx`
- Modify: `src/components/players/player-actions-cell.tsx`
- Modify: `src/components/forms/tournament-participants-form.tsx`
- Modify: `src/components/tournaments/tournament-detail-tabs.tsx`
- Modify: `src/lib/validators/public-registration.ts`
- Modify: `src/lib/actions/tournament.ts`
- Test: `tests/category-athlete-selection.test.ts`

**Interfaces:**
- Consumes: `tournament.arena.players`, where each player has `id`, `name`, `phone`, `cpf`, `birthDate`, and `active`.
- Produces: `createManualTournamentRegistrationAction` accepts `leadPlayerId` and `partnerPlayerId`, validates the pair, and persists the selected athlete data in a category registration.

- [ ] **Step 1: Write the failing schema, athlete form, and registration-contract test**

Create `tests/category-athlete-selection.test.ts` with assertions that document the required source contracts:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

test("manual category registration selects two master athletes", () => {
  const form = read("src", "components", "forms", "tournament-participants-form.tsx");
  const tabs = read("src", "components", "tournaments", "tournament-detail-tabs.tsx");

  assert.match(form, /name="leadPlayerId"/);
  assert.match(form, /name="partnerPlayerId"/);
  assert.match(form, /<option[^>]+value=\{player\.id\}>\{player\.name\}<\/option>/);
  assert.match(tabs, /players=\{tournament\.arena\.players\.map/);
});

test("master athletes retain the registration data required by categories", () => {
  const schema = read("prisma", "schema.prisma");
  const athleteForm = read("src", "components", "forms", "player-form.tsx");

  assert.match(schema, /phone\s+String/);
  assert.match(schema, /cpf\s+String/);
  assert.match(schema, /birthDate\s+DateTime\?/);
  assert.match(athleteForm, /name="phone"/);
  assert.match(athleteForm, /name="cpf"/);
  assert.match(athleteForm, /name="birthDate"/);
});

test("manual category registration rejects the same athlete twice", () => {
  const validator = read("src", "lib", "validators", "public-registration.ts");
  const action = read("src", "lib", "actions", "tournament.ts");

  assert.match(validator, /leadPlayerId: z\.string\(\)\.trim\(\)\.min\(1/);
  assert.match(validator, /partnerPlayerId: z\.string\(\)\.trim\(\)\.min\(1/);
  assert.match(action, /leadPlayerId === parsed\.data\.partnerPlayerId/);
  assert.match(action, /Os atletas da dupla devem ser diferentes/);
  assert.match(action, /active: true/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test tests/category-athlete-selection.test.ts`

Expected: FAIL because `Player` and the athlete form do not yet expose the registration details or the manual form exposes athlete IDs.

- [ ] **Step 3: Implement the smallest complete selection flow**

Add `phone String @default(\"\")`, `cpf String @default(\"\")`, and `birthDate DateTime?` to `Player`, then create the migration SQL that adds those columns without deleting existing athletes. Extend the player create/update Zod schemas and `createPlayerAction`/`updatePlayerAction` to persist them. Add inputs named `phone`, `cpf`, and `birthDate` to `PlayerForm` and the inline edit form.

In `TournamentParticipantsFormProps`, replace the legacy optional `players` checkbox shape with a manual-registration athlete shape that includes `id`, `name`, `phone`, `cpf`, and `birthDate`. In the manual registration form, replace the free-text athlete identity/contact inputs with two required `<select>` controls named `leadPlayerId` and `partnerPlayerId`; preserve only category, amount, and payment controls. Render a clear empty state with a link to `/jogadores` when no active and complete athletes are supplied.

In `TournamentParticipantsTab`, always render the category-registration form for manual tournaments and pass the active Arena players with the fields required to prefill the registration. Do not pass inactive or incomplete athletes.

Extend `createManualTournamentRegistrationSchema` with these fields:

```ts
leadPlayerId: z.string().trim().min(1, "Selecione o primeiro atleta."),
partnerPlayerId: z.string().trim().min(1, "Selecione o segundo atleta.")
```

In `createManualTournamentRegistrationAction`, parse the two IDs, reject equal IDs with `Os atletas da dupla devem ser diferentes.`, then query `prisma.player.findMany` with the authenticated `arenaId`, `active: true`, and both IDs. Reject with `Atleta não encontrado ou inativo.` unless exactly two athletes were returned. Use the resolved athlete fields when writing `leadName`, `leadPhone`, `leadCpf`, `leadBirthDate`, `partnerName`, `partnerPhone`, `partnerCpf`, and `partnerBirthDate`.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npx tsx --test tests/category-athlete-selection.test.ts; npm run typecheck`

Expected: both commands pass with no TypeScript errors.

- [ ] **Step 5: Run the complete verification suite and commit**

Run: `npx tsx --test tests/*.test.ts; npm run build; git diff --check`

Expected: all tests and build pass; `git diff --check` prints no output.

Commit:

```bash
git add src/components/forms/tournament-participants-form.tsx src/components/tournaments/tournament-detail-tabs.tsx src/lib/validators/public-registration.ts src/lib/actions/tournament.ts tests/category-athlete-selection.test.ts
git commit -m "fix: select athletes for tournament categories"
```

## Self-review

- The single task implements all requirements of the approved specification: active-athlete filtering, master-list selection, category-bound registration, duplicate-athlete rejection, and empty-state guidance.
- The plan contains no placeholders and does not add the deferred reset/status work.
- The fields used by the form, Zod validator, and server action use the same names: `leadPlayerId` and `partnerPlayerId`.
