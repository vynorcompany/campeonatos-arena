import type { Prisma, PrismaClient } from "@prisma/client";

type Period = { gte: Date; lte: Date };

export async function loadCashReportData(db: Pick<PrismaClient, "cashRegister" | "cashMovement">, arenaId: string, referenceDate: Period) {
  const where = { arenaId, referenceDate };
  const [registers, registerCount, movementCount, closedTotals] = await Promise.all([
    db.cashRegister.findMany({ where, include: { movements: { orderBy: { createdAt: "asc" } } }, orderBy: [{ referenceDate: "desc" }, { openedAt: "desc" }, { id: "desc" }], take: 250 }),
    db.cashRegister.count({ where }),
    db.cashMovement.count({ where: { arenaId, register: where } }),
    db.cashRegister.aggregate({ where: { ...where, status: "CLOSED" }, _sum: { differenceCents: true } }),
  ]);
  return { registers, registerCount, movementCount, differenceCents: closedTotals._sum.differenceCents ?? 0 };
}

export async function loadProductReportData(db: Pick<PrismaClient, "saleItem">, arenaId: string, period: Period) {
  const where: Prisma.SaleItemWhereInput = { sale: { arenaId, createdAt: period } };
  const [items, totals, products] = await Promise.all([
    db.saleItem.findMany({ where, include: { product: true, sale: { select: { createdAt: true } } }, orderBy: { sale: { createdAt: "desc" } }, take: 100 }),
    db.saleItem.aggregate({ where, _sum: { quantity: true, totalCents: true } }),
    db.saleItem.groupBy({ where, by: ["productId"] }),
  ]);
  return { items, quantity: totals._sum.quantity ?? 0, totalCents: totals._sum.totalCents ?? 0, productCount: products.length };
}

export async function loadStockReportData(db: Pick<PrismaClient, "stockMovement">, arenaId: string, period: Period) {
  const where = { arenaId, createdAt: period };
  const [movements, movementCount, byType] = await Promise.all([
    db.stockMovement.findMany({ where, include: { product: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.stockMovement.count({ where }),
    db.stockMovement.groupBy({ where, by: ["type"], _sum: { quantity: true } }),
  ]);
  return { movements, movementCount, entries: byType.find((group) => group.type === "IN")?._sum.quantity ?? 0, exits: byType.find((group) => group.type === "OUT")?._sum.quantity ?? 0 };
}

export async function loadComandaReportData(db: Pick<PrismaClient, "comanda" | "sale">, arenaId: string, period: Period) {
  const where = { arenaId, openedAt: period };
  const [comandas, count, openCount, sold] = await Promise.all([
    db.comanda.findMany({ where, include: { sale: true, _count: { select: { items: true } } }, orderBy: { openedAt: "desc" }, take: 100 }),
    db.comanda.count({ where }),
    db.comanda.count({ where: { ...where, status: "OPEN" } }),
    db.sale.aggregate({ where: { arenaId, comanda: { openedAt: period } }, _sum: { totalCents: true } }),
  ]);
  return { comandas, count, openCount, totalCents: sold._sum.totalCents ?? 0 };
}

export async function loadOnlinePaymentReportData(db: Pick<PrismaClient, "onlinePaymentCheckout">, arenaId: string, period: Period) {
  const where = { arenaId, createdAt: period };
  const [payments, byStatus] = await Promise.all([
    db.onlinePaymentCheckout.findMany({ where, include: { player: { select: { name: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 250 }),
    db.onlinePaymentCheckout.groupBy({ where, by: ["status"], _sum: { amountCents: true } }),
  ]);
  const amount = (statuses: string[]) => byStatus.filter((group) => statuses.includes(group.status.toUpperCase())).reduce((total, group) => total + (group._sum.amountCents ?? 0), 0);
  return { payments, confirmedCents: amount(["PAID"]), pendingCents: amount(["PENDING", "IN_PROCESS", "AUTHORIZED"]) };
}
