"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { cashReferenceDate } from "@/lib/finance/cash-day";
import { withArenaTransaction } from "@/lib/rls";

const moneySchema = z.string().trim().min(1);
const movementSchema = z.object({ registerId: z.string().min(1), type: z.enum(["SUPPLY", "WITHDRAWAL"]), amount: moneySchema, description: z.string().trim().max(240).default("") });

function cents(value: string) {
  const amount = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Informe um valor válido.");
  return Math.round(amount * 100);
}

function today() { return cashReferenceDate(); }
function refresh() { revalidatePath("/pdv/caixa"); revalidatePath("/relatorios/caixa"); revalidatePath("/painel"); }

export async function openCashRegisterAction(formData: FormData) {
  const auth = await requirePermission("pos:command:finish");
  const opening = moneySchema.safeParse(formData.get("openingAmount"));
  if (!opening.success) throw new Error("Informe o fundo de caixa.");
  const openingAmountCents = cents(opening.data);
  const openingNotes = String(formData.get("openingNotes") ?? "").trim().slice(0, 240);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const existing = await tx.cashRegister.findUnique({ where: { arenaId_referenceDate: { arenaId: auth.arenaId, referenceDate: today() } } });
    if (existing?.status === "OPEN") throw new Error("Já existe um caixa aberto para hoje.");
    if (existing) throw new Error("O caixa de hoje já foi encerrado. O próximo caixa poderá ser aberto amanhã.");
    await tx.cashRegister.create({ data: { arenaId: auth.arenaId, referenceDate: today(), openingAmountCents, expectedAmountCents: openingAmountCents, openingNotes, openedByName: auth.userName } });
  });
  refresh();
}

export async function createCashMovementAction(formData: FormData) {
  const auth = await requirePermission("pos:command:finish");
  const parsed = movementSchema.safeParse({ registerId: formData.get("registerId"), type: formData.get("type"), amount: formData.get("amount"), description: formData.get("description") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Movimentação inválida.");
  const amountCents = cents(parsed.data.amount);
  if (!amountCents) throw new Error("O valor deve ser maior que zero.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const register = await tx.cashRegister.findFirst({ where: { id: parsed.data.registerId, arenaId: auth.arenaId, status: "OPEN" } });
    if (!register) throw new Error("O caixa não está aberto.");
    const signedAmount = parsed.data.type === "WITHDRAWAL" ? -amountCents : amountCents;
    await tx.cashMovement.create({ data: { arenaId: auth.arenaId, registerId: register.id, type: parsed.data.type, amountCents: signedAmount, description: parsed.data.description, createdByName: auth.userName } });
    await tx.cashRegister.update({ where: { id: register.id }, data: { expectedAmountCents: { increment: signedAmount } } });
  });
  refresh();
}

export async function closeCashRegisterAction(formData: FormData) {
  const auth = await requirePermission("pos:command:finish");
  const registerId = z.string().min(1).safeParse(formData.get("registerId"));
  const counted = moneySchema.safeParse(formData.get("countedAmount"));
  if (!registerId.success || !counted.success) throw new Error("Informe a contagem final do caixa.");
  const countedAmountCents = cents(counted.data);
  const closingNotes = String(formData.get("closingNotes") ?? "").trim().slice(0, 240);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const register = await tx.cashRegister.findFirst({ where: { id: registerId.data, arenaId: auth.arenaId, status: "OPEN" } });
    if (!register) throw new Error("O caixa não está aberto.");
    await tx.cashRegister.update({ where: { id: register.id }, data: { status: "CLOSED", countedAmountCents, differenceCents: countedAmountCents - register.expectedAmountCents, closingNotes, closedAt: new Date(), closedByName: auth.userName } });
  });
  refresh();
}
