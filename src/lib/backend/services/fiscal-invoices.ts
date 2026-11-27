import 'server-only';
import { withArenaTransaction } from '@/lib/rls';
import { focusDocumentUrl, type FocusEnvironment } from '@/lib/fiscal/focus-document-url';
import { fiscalInvoicesDataSchema, fiscalFileTargetSchema, type FiscalFileKind } from '@/lib/backend/contracts/fiscal-invoices';
export async function resolveFiscalInvoices(arenaId: string, documentId?: string) {
  return withArenaTransaction(arenaId, async tx => {
    const documents = await tx.fiscalDocument.findMany({ where: { arenaId, ...(documentId ? { id: documentId } : {}) }, select: { id: true, number: true, series: true, supplierName: true, issuedAt: true, totalCents: true, documentType: true, direction: true, provider: true, status: true, environment: true, providerMessage: true, xmlUrl: true, printUrl: true, _count: { select: { items: true } } }, orderBy: { importedAt: 'desc' }, take: 30 });
    return fiscalInvoicesDataSchema.parse({ documents: documents.map(({ xmlUrl, printUrl, ...document }) => ({ ...document, issuedAt: document.issuedAt?.toISOString() ?? null, hasXml: document.provider === 'FOCUS' && Boolean(focusDocumentUrl(document.environment as FocusEnvironment, xmlUrl)), hasPrint: document.provider === 'FOCUS' && Boolean(focusDocumentUrl(document.environment as FocusEnvironment, printUrl)) })) });
  });
}
export async function resolveFiscalFile(arenaId: string, documentId: string, kind: FiscalFileKind) {
  return withArenaTransaction(arenaId, async tx => {
    const document = await tx.fiscalDocument.findFirst({ where: { arenaId, id: documentId, provider: 'FOCUS' }, select: { environment: true, xmlUrl: true, printUrl: true } });
    if (!document) return null;
    const url = focusDocumentUrl(document.environment as FocusEnvironment, kind === 'xml' ? document.xmlUrl : document.printUrl);
    return fiscalFileTargetSchema.parse(url ? { url } : null);
  });
}
