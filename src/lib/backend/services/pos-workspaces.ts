import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { cashReferenceDate } from '@/lib/finance/cash-day';
import { loadVisibleProductNames, visibleProductName } from '@/lib/products/visible-product-names';
import { cashWorkspaceDataSchema, salesWorkspaceDataSchema } from '@/lib/backend/contracts/cash-register';
export async function resolveCashWorkspace(arenaId: string) {
  const referenceDate = cashReferenceDate();
  return withArenaTransaction(arenaId, async tx => {
    const [register, previousClosing] = await Promise.all([
      tx.cashRegister.findFirst({ where: { arenaId, referenceDate }, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], select: { id: true, status: true, openingAmountCents: true, expectedAmountCents: true, countedAmountCents: true, differenceCents: true, movements: { orderBy: { createdAt: 'desc' }, select: { id: true, type: true, amountCents: true, description: true } } } }),
      tx.cashRegister.findFirst({ where: { arenaId, status: 'CLOSED' }, orderBy: [{ closedAt: 'desc' }, { id: 'desc' }], select: { countedAmountCents: true, expectedAmountCents: true } }),
    ]);
    return cashWorkspaceDataSchema.parse({ referenceDate: referenceDate.toISOString(), register, previousClosing });
  });
}
export async function resolveSalesWorkspace(arenaId: string) {
  return withArenaTransaction(arenaId, async tx => {
    const [sales, stockMovements] = await Promise.all([
      tx.sale.findMany({ where: { arenaId }, orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, code: true, totalCents: true, paymentMethod: true, createdAt: true, items: { select: { productId: true, quantity: true } } } }),
      tx.stockMovement.findMany({ where: { arenaId }, orderBy: { createdAt: 'desc' }, take: 24, select: { id: true, productId: true, type: true, quantity: true, reason: true, createdAt: true } }),
    ]);
    const names = await loadVisibleProductNames(tx, arenaId, [...sales.flatMap(sale => sale.items.map(item => item.productId)), ...stockMovements.map(row => row.productId)]);
    return salesWorkspaceDataSchema.parse({ sales: sales.map(sale => ({ ...sale, createdAt: sale.createdAt.toISOString(), items: sale.items.map(item => ({ quantity: item.quantity, productName: visibleProductName(names, item.productId) })) })), stockMovements: stockMovements.map(row => ({ id: row.id, type: row.type, quantity: row.quantity, reason: row.reason, createdAt: row.createdAt.toISOString(), productName: visibleProductName(names, row.productId) })) });
  });
}
