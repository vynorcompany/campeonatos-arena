import 'server-only';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { fiscalInvoicesDataSchema, fiscalFileTargetSchema, type FiscalFileKind } from '@/lib/backend/contracts/fiscal-invoices';
export async function getFiscalInvoices(arenaId: string, documentId?: string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const data = origin ? await readBackendContract(origin, `/api/management/finance/invoices?${new URLSearchParams(documentId ? { documentId } : {})}`, fiscalInvoicesDataSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : await (await import('@/lib/backend/services/fiscal-invoices')).resolveFiscalInvoices(arenaId, documentId);
  return { documents: data.documents.map(document => ({ ...document, issuedAt: document.issuedAt ? new Date(document.issuedAt) : null })) };
}
export async function getFiscalFileTarget(arenaId: string, documentId: string, kind: FiscalFileKind) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  return origin ? readBackendContract(origin, `/api/management/finance/invoices/files/${encodeURIComponent(documentId)}/${kind}`, fiscalFileTargetSchema, { cookie: (await managementCookieHeader()) ?? '' }, { timeoutMs: 60000 }) : (await import('@/lib/backend/services/fiscal-invoices')).resolveFiscalFile(arenaId, documentId, kind);
}
