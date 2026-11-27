import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { loadVisibleProductNames, visibleProductName } from '@/lib/products/visible-product-names';
import { stockSnapshotSchema, stockWorkspaceDataSchema, type StockWorkspace, type StockWorkspaceQuery } from '@/lib/backend/contracts/stock-workspaces';
export async function resolveStockWorkspace(arenaId: string, workspace: StockWorkspace, query: StockWorkspaceQuery, canEdit: boolean) {
  return withArenaTransaction(arenaId, async tx => {
    const result = { categories: [] as {id:string;name:string}[], products: [] as {id:string;name:string;sku:string;stockQuantity:number;minStock:number}[], movements: [] as {id:string;productName:string;reason:string;createdAt:string}[], balances: [] as {id:string;title:string;actorName:string;createdAt:string}[], snapshot: null as ReturnType<typeof stockSnapshotSchema.parse> | null };
    if (workspace === 'new-product' && canEdit) result.categories = await tx.productCategory.findMany({ where: { arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
    if (workspace === 'balance') {
      if (query.creating === '1' && canEdit) result.products = await tx.product.findMany({ where: { arenaId, active: true, isService: false }, select: { id: true, name: true, sku: true, stockQuantity: true, minStock: true }, orderBy: { name: 'asc' } });
      if (query.creating !== '1') {
        const balances = await tx.auditEvent.findMany({ where: { arenaId, action: 'STOCK_BALANCE_COMPLETED' }, select: { id: true, details: true, createdAt: true, actorName: true }, orderBy: { createdAt: 'desc' }, take: 100 });
        result.balances = balances.map(row => ({ id: row.id, title: row.details && typeof row.details === 'object' && !Array.isArray(row.details) && typeof row.details.title === 'string' ? row.details.title || 'Balanço de estoque' : 'Balanço de estoque', actorName: row.actorName, createdAt: row.createdAt.toISOString() }));
      }
      if (query.history === '1') {
        const movements = await tx.stockMovement.findMany({ where: { arenaId, type: 'ADJUST', reason: { startsWith: 'Balanço ' } }, select: { id: true, productId: true, reason: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 40 });
        const names = await loadVisibleProductNames(tx, arenaId, movements.map(row => row.productId));
        result.movements = movements.map(row => ({ id: row.id, reason: row.reason, productName: visibleProductName(names, row.productId), createdAt: row.createdAt.toISOString() }));
      }
    }
    if (workspace === 'balance-detail' && query.id) {
      const balance = await tx.auditEvent.findFirst({ where: { id: query.id, arenaId, action: 'STOCK_BALANCE_COMPLETED' }, select: { details: true } });
      const parsed = stockSnapshotSchema.safeParse(balance?.details); if (parsed.success) result.snapshot = parsed.data;
    }
    return stockWorkspaceDataSchema.parse(result);
  });
}
