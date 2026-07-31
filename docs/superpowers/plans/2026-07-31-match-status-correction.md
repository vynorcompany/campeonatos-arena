# Correção de status e placar de jogos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reabrir e corrigir placares/status de partidas publicadas, sem corromper classificação ou chaves de mata-mata.

**Architecture:** O campo existente `CategoryMatch.manualStatus` passa a ser a fonte explícita do status operacional. Serviços de resultado e status usam uma mesma verificação de dependência futura de mata-mata antes de modificar um jogo finalizado; a interface somente apresenta os controles e o estado retornado.

**Tech Stack:** Next.js 14, React 18, TypeScript, Prisma/PostgreSQL, Zod, Node test runner via `tsx --test`.

## Global Constraints

- Trabalhar somente na worktree `C:\Users\jefer\campeonatos-arena\.worktrees\tournament-management-implementation` e no banco local; não tocar Railway.
- Usar o campo existente `CategoryMatch.manualStatus`; não criar migration nem alterar dados históricos.
- Status aceitos: `SCHEDULED`, `LIVE`, `FINISHED`.
- Placar e status são editáveis somente em competição `PUBLISHED`, por usuário com `requireModuleEdit("tournaments")`, no escopo da arena.
- Reabrir para `SCHEDULED` ou `LIVE` preserva placares e limpa `winnerPairId`; somente jogos com vencedor contam para classificação e conclusão.
- Em mata-mata, negar qualquer correção de placar/status em jogo finalizado quando seu vencedor já ocupa uma partida posterior; nunca limpar partidas seguintes automaticamente.
- Jogos e resultados de categorias distintas permanecem isolados.

---

## Estrutura de arquivos

- `src/lib/validators/category-competition.ts`: schema do status de partida.
- `src/lib/services/category-competition.ts`: regras transacionais de status, resultado e bloqueio de avanço.
- `src/lib/actions/category-competition.ts`: action protegida para alterar status.
- `src/components/tournaments/category-results-panel.tsx`: seletor de status e apresentação do estado manual.
- `tests/category-match-status.test.ts`: regras puras/contratos de status e bloqueio.
- `tests/category-competition-actions.test.ts`: cobertura de ação e integração de escopo.

## Task 1: Regras transacionais de status e resultado

**Files:**
- Modify: `src/lib/validators/category-competition.ts`
- Modify: `src/lib/services/category-competition.ts`
- Modify: `src/lib/actions/category-competition.ts`
- Create: `tests/category-match-status.test.ts`
- Modify: `tests/category-competition-actions.test.ts`

**Interfaces:**
- Consumes: `CategoryMatch.manualStatus`, `winnerPairId`, `roundOrder`, `homePairId`, `awayPairId`.
- Produces: `updateCategoryMatchStatus(arenaId, matchId, status)` and `updateCategoryMatchStatusAction(formData)`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
test("reabrir um jogo de Liga preserva o placar e remove o vencedor", () => {
  const next = buildReopenedMatch({ homeScore: 6, awayScore: 4, winnerPairId: "pair-a" }, "LIVE");
  assert.deepEqual(next, { homeScore: 6, awayScore: 4, winnerPairId: null, manualStatus: "LIVE" });
});

test("bloqueia correção de mata-mata após o vencedor ocupar fase posterior", () => {
  assert.throws(() => assertMatchCanBeCorrected({ stage: "QUARTERFINAL", winnerPairId: "pair-a", hasDownstreamParticipant: true }), /próxima fase/);
});

test("valida apenas os três status de jogo", () => {
  assert.equal(updateCategoryMatchStatusSchema.safeParse({ matchId: "match-1", status: "LIVE" }).success, true);
  assert.equal(updateCategoryMatchStatusSchema.safeParse({ matchId: "match-1", status: "CANCELLED" }).success, false);
});
```

- [ ] **Step 2: Confirmar RED**

Run: `npx tsx --test tests/category-match-status.test.ts`

Expected: FAIL because the helper and status schema do not exist.

- [ ] **Step 3: Implementar schema, helpers e ação protegida**

```ts
export const categoryMatchStatusSchema = z.enum(["SCHEDULED", "LIVE", "FINISHED"]);
export const updateCategoryMatchStatusSchema = z.object({
  matchId: z.string().trim().min(1, "Jogo inválido."),
  status: categoryMatchStatusSchema,
});

export function buildReopenedMatch(match: Pick<CategoryMatch, "homeScore" | "awayScore">, status: "SCHEDULED" | "LIVE") {
  return { homeScore: match.homeScore, awayScore: match.awayScore, winnerPairId: null, manualStatus: status };
}
```

In the service, load the target match through `competition.status = PUBLISHED` and arena ownership inside `runSerializableTransaction`. Before changing any completed knockout match (status change or result save), query later matches in the same competition with `roundOrder > target.roundOrder` and `homePairId`/`awayPairId` equal to `target.winnerPairId`. If any exists, throw `"Não é possível corrigir este jogo porque o vencedor já foi enviado para a próxima fase."`.

`updateCategoryMatchStatus` rules:

```ts
if (status === "FINISHED") {
  if (match.homeScore === null || match.awayScore === null) throw new Error("Informe um placar vencedor antes de finalizar o jogo.");
  const winnerPairId = getWinnerPairId(match.homePairId!, match.awayPairId!, match.homeScore, match.awayScore);
  // update manualStatus FINISHED + winnerPairId; advance knockout only when winner was previously null
} else {
  // preserve scores; update manualStatus and clear winnerPairId
}
```

`recordCategoryMatchResult` must set `manualStatus: "FINISHED"`; if it is correcting an existing winner, call the same downstream guard before changing score/winner. Do not permit score ties.

Action implementation:

```ts
export async function updateCategoryMatchStatusAction(formData: FormData) {
  const auth = await requireModuleEdit("tournaments");
  const parsed = updateCategoryMatchStatusSchema.safeParse({ matchId: formData.get("matchId"), status: formData.get("status") });
  if (!parsed.success) throw new Error(invalidInputMessage(parsed.error));
  const result = await updateCategoryMatchStatus(auth.arenaId, parsed.data.matchId, parsed.data.status);
  refreshCategoryCompetitionRoutes();
  return result;
}
```

- [ ] **Step 4: Confirmar GREEN e regressão de escopo**

Run: `npx tsx --test tests/category-match-status.test.ts tests/category-competition-actions.test.ts`

Expected: all tests pass; include checks that the action requires tournament edit access and does not accept a match from another arena.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/category-competition.ts src/lib/services/category-competition.ts src/lib/actions/category-competition.ts tests/category-match-status.test.ts tests/category-competition-actions.test.ts
git commit -m "feat: allow safe category match status corrections"
```

## Task 2: Controles de status na linha de jogo

**Files:**
- Modify: `src/components/tournaments/category-results-panel.tsx`
- Modify: `src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx`
- Modify: `tests/tournament-management.test.ts`

**Interfaces:**
- Consumes: `updateCategoryMatchStatusAction`, `CompetitionMatch.manualStatus` and the status options from Task 1.
- Produces: status selector displayed in each published game row.

- [ ] **Step 1: Escrever teste que falha para os controles**

```ts
test("jogos da categoria oferecem status Agendado, Em andamento e Finalizado", async () => {
  const panel = await readFile(path.join(workspaceRoot, "src", "components", "tournaments", "category-results-panel.tsx"), "utf8");
  assert.match(panel, /updateCategoryMatchStatusAction/);
  assert.match(panel, /value="SCHEDULED"/);
  assert.match(panel, /value="LIVE"/);
  assert.match(panel, /value="FINISHED"/);
});
```

- [ ] **Step 2: Confirmar RED**

Run: `npx tsx --test tests/tournament-management.test.ts`

Expected: FAIL because the status action/select is absent.

- [ ] **Step 3: Exibir status manual e ação compacta**

Extend the route selection passed to `CategoryResultsPanel` with `manualStatus`. Replace the derived display with:

```ts
const matchStatus = match.manualStatus ?? (match.winnerPair ? "FINISHED" : "SCHEDULED");
```

For `PUBLISHED` games, add a compact form inside `.category-game-actions`:

```tsx
<form action={updateCategoryMatchStatusAction} className="field-inline category-game-form">
  <input type="hidden" name="matchId" value={match.id} />
  <select name="status" defaultValue={matchStatus} aria-label={`Status de ${match.label}`}>
    <option value="SCHEDULED">Agendado</option>
    <option value="LIVE">Em andamento</option>
    <option value="FINISHED">Finalizado</option>
  </select>
  <SubmitButton label="Salvar status" pendingLabel="..." className="button" />
</form>
```

Keep score fields available for published games. Use `Salvar resultado` when `winnerPair` is null and `Atualizar resultado` otherwise. The server action error is the source of truth for blocked knockout correction.

- [ ] **Step 4: Confirmar GREEN e typecheck**

Run: `npx tsx --test tests/tournament-management.test.ts && npm run typecheck`

Expected: tests and TypeScript exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/tournaments/category-results-panel.tsx src/app/'(app)'/torneios/'[tournamentId]'/categorias/'[categoryId]'/page.tsx tests/tournament-management.test.ts
git commit -m "feat: expose editable category match statuses"
```

## Task 3: Revisão e verificação local

**Files:**
- Modify only if review finds a Critical or Important defect.

- [ ] **Step 1: Revisão independente**

Review transaction safety, arena scope, score/status consistency, classification recalculation, and the downstream knockout guard. Confirm that re-opening a finished group match cannot leave a stale group table or a stale knockout winner.

- [ ] **Step 2: Corrigir qualquer achado Critical/Important com teste de regressão**

Run: `npx tsx --test tests/category-match-status.test.ts tests/category-competition-actions.test.ts tests/tournament-management.test.ts`

Expected: all pass after each correction.

- [ ] **Step 3: Verificação final**

Run: `npx tsx --test tests/*.test.ts && npm run typecheck && npm run build`

Expected: full suite, typecheck and build exit 0. Stop only the known local Next dev server before build if its Prisma process locks the Windows query-engine DLL, then restart it on port 3005 and verify `http://127.0.0.1:3005/login` responds HTTP 200.
