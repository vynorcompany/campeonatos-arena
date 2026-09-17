import type { Prisma } from "@prisma/client";

export type FiscalDocumentType = "NFS_E" | "NFC_E";

/**
 * Creates a numbered fiscal record when the arena uses the built-in manual
 * emission control. It deliberately does not claim authorization by SEFAZ or
 * a municipal provider; those integrations can replace this adapter later.
 */
export async function issueManualFiscalDocument(
  tx: Prisma.TransactionClient,
  input: {
    arenaId: string;
    documentType: FiscalDocumentType;
    totalCents: number;
    customerName: string;
    financialEntryId?: string;
    saleId?: string;
  }
) {
  const settings = await tx.fiscalSettings.findUnique({ where: { arenaId: input.arenaId } });
  if (!settings?.enabled || settings.provider !== "MANUAL") {
    throw new Error("Configure a emissão fiscal manual antes de emitir um documento.");
  }

  const number = String(settings.nextNumber);
  const accessKey = `MANUAL-${input.documentType}-${settings.nextNumber}`;
  const document = await tx.fiscalDocument.create({
    data: {
      arenaId: input.arenaId,
      direction: "OUTGOING",
      status: "ISSUED",
      documentType: input.documentType,
      accessKey,
      number,
      series: settings.series,
      supplierName: input.customerName,
      issuedAt: new Date(),
      totalCents: input.totalCents,
      financialEntryId: input.financialEntryId,
      saleId: input.saleId,
    },
  });
  await tx.fiscalSettings.update({ where: { id: settings.id }, data: { nextNumber: { increment: 1 } } });
  return document;
}
