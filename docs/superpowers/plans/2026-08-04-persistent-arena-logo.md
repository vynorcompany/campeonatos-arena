# Persistent Arena Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the Arena profile logo independently of Railway's runtime filesystem.

**Architecture:** Add a focused helper that validates an Arena logo and converts it to a `data:image/...;base64,...` URL. `updateArenaProfileAction` will use this helper instead of the runtime filesystem upload; `Arena.logoUrl` already provides durable database-backed storage and all consumers already render that field.

**Tech Stack:** Next.js server action, TypeScript, Vitest-compatible Node test runner, Prisma.

## Global Constraints

- Persist only the Arena profile logo as a PNG data URL in the existing `Arena.logoUrl` text field.
- Keep the existing accepted image types, with a 500 KB maximum for the persisted Arena logo; other upload flows retain their 4 MB limit.
- Do not change other upload flows.
- Replace the existing broken `/uploads/...` Arena logo when a new image is saved.

---

### Task 1: Create a durable Arena-logo conversion helper

**Files:**
- Modify: `src/lib/uploads.ts`
- Create: `tests/arena-logo-upload.test.ts`

**Interfaces:**
- Produces: `toPersistentArenaLogo(file: File | null): Promise<string | null>`.
- Consumes: browser-compatible `File` objects and the existing image validation constants.

- [ ] **Step 1: Write the failing helper contract**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { toPersistentArenaLogo } from "@/lib/uploads";

test("Arena logo is persisted as a PNG data URL", async () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "arena.png", { type: "image/png" });
  const logoUrl = await toPersistentArenaLogo(file);
  assert.match(logoUrl ?? "", /^data:image\/png;base64,/);
});
```

- [ ] **Step 2: Run the test to confirm the helper is missing**

Run: `npx tsx --test tests/arena-logo-upload.test.ts`

Expected: FAIL because `toPersistentArenaLogo` is not exported.

- [ ] **Step 3: Implement the minimum durable conversion**

```ts
export async function toPersistentArenaLogo(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = allowedImageTypes.get(file.type);
  if (!extension) throw new Error("Envie uma imagem JPG, PNG, WEBP ou SVG.");
  if (file.size > maxUploadSize) throw new Error("A imagem deve ter no máximo 4 MB.");
  return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}
```

- [ ] **Step 4: Run the helper contract**

Run: `npx tsx --test tests/arena-logo-upload.test.ts`

Expected: PASS.

### Task 2: Store the profile logo through the durable helper

**Files:**
- Modify: `src/lib/actions/arena.ts:7,47`
- Test: `tests/arena-logo-upload.test.ts`

**Interfaces:**
- Consumes: `toPersistentArenaLogo(formData.get("logo") as File | null)`.
- Produces: a durable `logoUrl` value in the existing `prisma.arena.update` call.

- [ ] **Step 1: Replace the filesystem upload call**

```ts
import { toPersistentArenaLogo } from "@/lib/uploads";

const logoUrl = await toPersistentArenaLogo(formData.get("logo") as File | null);
```

- [ ] **Step 2: Run the targeted regression test**

Run: `npx tsx --test tests/arena-logo-upload.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typecheck and production build**

Run:

```powershell
npm run typecheck
node --env-file=C:\Users\jefer\campeonatos-arena\.worktrees\tournament-management-implementation\.env node_modules\next\dist\bin\next build
node scripts\prepare-standalone.mjs
```

Expected: all commands exit with status 0.

- [ ] **Step 4: Commit the fix**

```powershell
git add src/lib/uploads.ts src/lib/actions/arena.ts tests/arena-logo-upload.test.ts
git commit -m "fix: persist arena logos outside runtime filesystem"
```
