import type { Prisma } from "@prisma/client";

/** Resolve the canonical payee inside the arena transaction; never trust a submitted name. */
export async function resolvePayablePayee(tx: Prisma.TransactionClient, arenaId: string, form: FormData, fallbackName: string) {
  const kind = String(form.get("payeeKind") ?? "SUPPLIER");
  const id = String(form.get("payeeId") ?? form.get("supplierId") ?? "").trim();
  if (id.length > 160) throw new Error("Favorecido inválido.");
  const empty = { supplierId: null as string | null, payeeEmployeeId: null as string | null, payeeTeacherId: null as string | null };
  if (kind === "EMPLOYEE") {
    const member = id ? await tx.arenaMember.findFirst({ where: { arenaId, userId: id }, select: { user: { select: { id: true, name: true } } } }) : null;
    if (!member) throw new Error("Selecione um funcionário cadastrado nesta arena.");
    return { ...empty, payeeEmployeeId: member.user.id, counterpartyName: member.user.name };
  }
  if (kind === "TEACHER") {
    const teacher = id ? await tx.teacher.findFirst({ where: { arenaId, id, active: true }, select: { id: true, name: true } }) : null;
    if (!teacher) throw new Error("Selecione um professor ativo desta arena.");
    return { ...empty, payeeTeacherId: teacher.id, counterpartyName: teacher.name };
  }
  if (kind !== "SUPPLIER") throw new Error("Tipo de favorecido inválido.");
  if (id) {
    const supplier = await tx.supplier.findFirst({ where: { arenaId, id }, select: { id: true, name: true } });
    if (!supplier) throw new Error("Selecione um fornecedor desta arena.");
    return { ...empty, supplierId: supplier.id, counterpartyName: supplier.name };
  }
  // Preserve older forms and historical entries that only supplied the name.
  if (!fallbackName.trim()) return { ...empty, counterpartyName: "" };
  const supplier = await tx.supplier.upsert({ where: { arenaId_name: { arenaId, name: fallbackName.trim() } }, update: {}, create: { arenaId, name: fallbackName.trim() } });
  return { ...empty, supplierId: supplier.id, counterpartyName: supplier.name };
}
