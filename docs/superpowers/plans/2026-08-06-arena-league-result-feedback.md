# Arena League Result Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show invalid League set-score feedback inside the result dialog instead of causing a generic Next.js error page.

**Architecture:** The League server action will convert expected validation and service errors to a small serializable form state. The client dialog will submit through `useFormState`, render that state in an accessible alert, and retain the entered values until the user corrects them.

**Tech Stack:** Next.js 14 Server Actions, React 18 `useFormState`, TypeScript, Zod, Node.js test runner via `tsx`.

## Global Constraints

- Preserve the existing League set rules: sets 1 and 2 are required and cannot tie; set 3 is only valid as a tie-break.
- Do not change standings, result persistence, or non-League result flows.
- The server action must not throw expected user input errors.

---

### Task 1: Define the serializable League result state (complete)

**Files:**
- Create: `src/lib/actions/league-match-result-state.ts`
- Create: `src/lib/actions/league-match-result-state.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `LeagueMatchResultActionState` with `{ error: string | null; success: boolean }`.
- Produces: `initialLeagueMatchResultActionState` and `leagueMatchResultErrorState(error)`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { leagueMatchResultErrorState } from "./league-match-result-state";

test("converts a League validation error into form state", () => {
  assert.deepEqual(
    leagueMatchResultErrorState(new Error("Informe os dois primeiros sets sem empate.")),
    { error: "Informe os dois primeiros sets sem empate.", success: false },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test src/lib/actions/league-match-result-state.test.ts`

Expected: FAIL because `src/lib/actions/league-match-result-state.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/actions/league-match-result-state.ts`:

```ts
export type LeagueMatchResultActionState = {
  error: string | null;
  success: boolean;
};

export function leagueMatchResultErrorState(error: unknown): LeagueMatchResultActionState {
  return {
    error: error instanceof Error ? error.message : "Não foi possível salvar o resultado.",
    success: false,
  };
}

export const initialLeagueMatchResultActionState: LeagueMatchResultActionState = {
  error: null,
  success: false,
};
```

Add this package script:

```json
"test": "node --import tsx --test"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/actions/league-match-result-state.test.ts`

Expected: PASS with one test.

- [ ] **Step 5: Commit**

```bash
git add package.json src/lib/actions/league-match-result-state.ts src/lib/actions/league-match-result-state.test.ts
git commit -m "test: define league result action state"
```

### Task 2: Render server feedback in the League dialog (complete)

**Files:**
- Modify: `src/lib/actions/category-competition.ts`
- Modify: `src/components/tournaments/league-match-result-dialog.tsx`

**Interfaces:**
- Consumes: `LeagueMatchResultActionState`, `initialLeagueMatchResultActionState`, and `leagueMatchResultErrorState` from `src/lib/actions/league-match-result-state.ts`.
- Produces: an inline error alert for invalid League score submissions.

- [ ] **Step 1: Write minimal implementation**

In `src/lib/actions/category-competition.ts`, import the state type and error mapper, then change the action to this signature and body:

```ts
export async function recordCategoryLeagueMatchResultAction(
  _: LeagueMatchResultActionState,
  formData: FormData,
): Promise<LeagueMatchResultActionState> {
  try {
    const auth = await requireModuleEdit("tournaments");
    const parsed = recordCategoryLeagueMatchResultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: invalidInputMessage(parsed.error), success: false };
    await recordCategoryLeagueMatchResult(auth.arenaId, parsed.data);
    refreshCategoryCompetitionRoutes();
    return { error: null, success: true };
  } catch (error) {
    return leagueMatchResultErrorState(error);
  }
}
```

Replace the direct form action in the dialog with `useFormState` and render the returned message:

```tsx
import { useFormState } from "react-dom";
import { recordCategoryLeagueMatchResultAction } from "@/lib/actions/category-competition";
import { initialLeagueMatchResultActionState } from "@/lib/actions/league-match-result-state";

const [state, formAction] = useFormState(
  recordCategoryLeagueMatchResultAction,
  initialLeagueMatchResultActionState,
);

<form action={formAction} className="stack-md">
  {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
</form>
```

Keep the existing hidden match id and six Set 1–3 score inputs inside this form.

- [ ] **Step 2: Run tests and static verification**

Run: `npm test -- src/lib/actions/league-match-result-state.test.ts && npm run typecheck && npm run build`

Expected: all commands exit with status 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/category-competition.ts src/lib/actions/league-match-result-state.ts src/lib/actions/league-match-result-state.test.ts src/components/tournaments/league-match-result-dialog.tsx package.json
git commit -m "fix: show league score errors in dialog"
```

### Task 3: Restrict feedback handling to expected result errors

**Files:**
- Modify: `src/lib/actions/category-competition.ts`
- Modify: `src/lib/actions/league-match-result-state.ts`
- Modify: `src/lib/actions/league-match-result-state.test.ts`
- Modify: `src/components/tournaments/league-match-result-dialog.tsx`

**Interfaces:**
- `leagueMatchResultErrorState(error)` returns a form state only for expected League result errors and rethrows all other errors.
- `recordCategoryLeagueMatchResultAction` performs authorization and validation outside its service-error boundary; route revalidation is only run after a successful service call.

- [ ] **Step 1: Add failing tests for the boundary**

```ts
test("rethrows an unexpected error instead of exposing it to the form", () => {
  assert.throws(
    () => leagueMatchResultErrorState(new Error("database connection refused")),
    /database connection refused/,
  );
});
```

Add a regression test for the schema message returned by the action boundary, asserting that `"Informe os dois primeiros sets sem empate."` becomes `{ error: "Informe os dois primeiros sets sem empate.", success: false }`.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/lib/actions/league-match-result-state.test.ts`

Expected: FAIL because the mapper currently returns every error message as form state.

- [ ] **Step 3: Implement the narrow boundary**

Use an allowlist containing only `"Jogo de Liga inválido."` and `"Uma dupla deve vencer dois sets."`; preserve the form message only for those values and rethrow every other error. In the server action, call `requireModuleEdit` before parsing input, return `{ error: invalidInputMessage(parsed.error), success: false }` for schema failure, then wrap only `recordCategoryLeagueMatchResult`; run `refreshCategoryCompetitionRoutes` after that `try` succeeds.

Move `useFormState` into a small child form component rendered only while `open` is true, so closing the dialog clears stale form feedback while invalid submissions still preserve the mounted form fields.

- [ ] **Step 4: Verify the boundary and build**

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit with status 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/category-competition.ts src/lib/actions/league-match-result-state.ts src/lib/actions/league-match-result-state.test.ts src/components/tournaments/league-match-result-dialog.tsx
git commit -m "fix: limit league result feedback errors"
```

### Task 4: Exercise invalid score submission as data

**Files:**
- Create: `src/lib/actions/league-match-result-input.ts`
- Create: `src/lib/actions/league-match-result-input.test.ts`
- Modify: `src/lib/actions/category-competition.ts`

**Interfaces:**
- Produces a pure parser that accepts `FormData` and returns either validated League input or `LeagueMatchResultActionState` containing the first schema error.
- The server action must consume this parser for its schema-error branch.

- [ ] **Step 1: Write a failing FormData regression test**

Create `FormData` with a match id and tied first-set values, submit it to the pure parser, and assert it returns `{ error: "Informe os dois primeiros sets sem empate.", success: false }`.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- src/lib/actions/league-match-result-input.test.ts`

Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement and connect the pure parser**

Parse `Object.fromEntries(formData)` with `recordCategoryLeagueMatchResultSchema`. Return a serializable error state on `safeParse` failure and validated data on success. Replace the action's direct `safeParse` branch with this parser, preserving authorization before parsing and the existing service-only error boundary.

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit with status 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/league-match-result-input.ts src/lib/actions/league-match-result-input.test.ts src/lib/actions/category-competition.ts
git commit -m "test: cover invalid league score submission"
```
