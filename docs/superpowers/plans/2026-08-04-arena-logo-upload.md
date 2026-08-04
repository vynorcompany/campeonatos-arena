# Arena Logo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stored Arena logo with the approved transparent PNG.

**Architecture:** Use the existing protected Arena profile upload action. It validates the image, stores it with the configured public image provider, and updates `Arena.logoUrl`; all existing consumers then render the replacement automatically.

**Tech Stack:** Next.js server action, existing public image upload service, Prisma, PNG.

## Global Constraints

- Upload exactly `C:/Users/jefer/Downloads/ARENA/Logos/LOGO BRANCA - SEM FUNDO.png`.
- Do not change the layout, CSS, or image processing.
- Preserve the existing Arena logo upload validation and storage path.

---

### Task 1: Replace the Arena profile image

**Files:**
- Modify: Arena `logoUrl` through the existing protected profile upload form.
- Test: public standings page at `/classificacao/[arenaSlug]`.

**Interfaces:**
- Consumes: the existing `saveArenaProfileAction` form action and uploaded PNG file.
- Produces: the updated `Arena.logoUrl` used by the public standings and TV pages.

- [ ] **Step 1: Inspect the source file metadata**

Run:

```powershell
Get-Item 'C:\Users\jefer\Downloads\ARENA\Logos\LOGO BRANCA - SEM FUNDO.png' | Select-Object Name, Length
```

Expected: the approved PNG is available locally.

- [ ] **Step 2: Upload the PNG through the Arena profile form**

Open the authenticated Arena profile page, select the file path above for the `logo` field, and submit the existing form. The form posts its `FormData` to the current action:

```ts
saveArenaProfileAction(formData)
```

Expected: the action stores the public image and updates `Arena.logoUrl`.

- [ ] **Step 3: Verify the public page uses the replacement**

Open the Arena public standings URL and confirm that its header image loads from the newly stored `Arena.logoUrl` without a black CSS container.

Expected: the visible logo is the supplied transparent PNG.

- [ ] **Step 4: Record the completed data update**

Run:

```powershell
git status --short
```

Expected: no application source changes are required; retain the committed specification and plan as the audit trail.
