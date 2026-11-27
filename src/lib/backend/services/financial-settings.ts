import 'server-only';
import { arenaDatabase } from '@/lib/arena-database';
import { withArenaTransaction } from '@/lib/rls';
import { calculateBankAccountBalanceCents } from '@/lib/finance/bank-balance';
import { financialSettingsPageSchema, type FinancialSettingsArea } from '@/lib/backend/contracts/financial-settings';
export async function resolveFinancialSettingsPage(arenaId: string, area: FinancialSettingsArea) {
  const db = arenaDatabase(arenaId);
  const result = financialSettingsPageSchema.parse({ productCategories: [], coupons: [], fiscal: null, connections: [], categories: [], rows: [] });
  if (area === 'categorias-produtos') result.productCategories = await db.productCategory.findMany({ where: { arenaId }, select: { id: true, name: true, active: true, _count: { select: { products: true } } }, orderBy: { name: 'asc' } });
  if (area === 'cupons') {
    const coupons = await db.coupon.findMany({ where: { arenaId }, select: { id: true, code: true, discountType: true, discountValue: true, minimumAmountCents: true, maxUses: true, usesCount: true, startsAt: true, endsAt: true, active: true }, orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] });
    result.coupons = coupons.map(entry => ({ ...entry, startsAt: entry.startsAt?.toISOString() ?? null, endsAt: entry.endsAt?.toISOString() ?? null }));
  }
  if (area === 'notas-fiscais') {
    const settings = await db.fiscalSettings.findUnique({ where: { arenaId }, select: { crt: true, issuerState: true, provider: true, environment: true, series: true, nextNumber: true, notes: true, focusCnpj: true, encryptedFocusTokens: true } });
    if (settings) { const { encryptedFocusTokens, ...publicSettings } = settings; result.fiscal = { ...publicSettings, hasFocusTokens: Boolean(encryptedFocusTokens) }; }
  }
  if (area === 'pagamentos-online') result.connections = await db.paymentConnection.findMany({ where: { arenaId }, select: { provider: true, status: true, displayName: true, accountReference: true } });
  if (area === 'categorias-financeiras') result.categories = await db.financialCategory.findMany({ where: { arenaId }, select: { id: true, name: true, type: true, dreGroup: true }, orderBy: { name: 'asc' } });
  if (area === 'formas-pagamento') {
    // Preserve the existing lazy defaults, scoped to the authenticated arena.
    await db.paymentMethodSetting.createMany({ data: ['PIX', 'Cartão de débito', 'Cartão de crédito', 'Boleto'].map(name => ({ arenaId, name })), skipDuplicates: true });
    result.rows = (await db.paymentMethodSetting.findMany({ where: { arenaId }, select: { name: true, active: true }, orderBy: { name: 'asc' } })).map(entry => ({ id: '', name: entry.name, detail: entry.active ? 'Ativa' : 'Inativa', balance: 0, type: '' }));
  }
  if (area === 'contas-bancarias') result.rows = await withArenaTransaction(arenaId, async tx => {
    const accounts = await tx.bankAccount.findMany({ where: { arenaId }, orderBy: { name: 'asc' } });
    return Promise.all(accounts.map(async entry => ({ id: entry.id, name: entry.name, detail: entry.bankName || 'Banco não informado', balance: await calculateBankAccountBalanceCents(tx, arenaId, entry.id, entry.openingBalanceCents), type: '' })));
  });
  if (area === 'fornecedores') result.rows = (await db.supplier.findMany({ where: { arenaId }, select: { id: true, name: true, document: true, phone: true, email: true, notes: true, active: true }, orderBy: { name: 'asc' } })).map(entry => ({ id: entry.id, name: entry.name, detail: [entry.document, entry.phone, entry.email].filter(Boolean).join(' · ') || 'Sem contato informado', balance: 0, type: '', supplier: entry }));
  return financialSettingsPageSchema.parse(result);
}
