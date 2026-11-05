import "server-only";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { arenaDatabase } from "@/lib/arena-database";
import { decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { buildFocusNfce, FocusFiscalValidationError } from "./focus-payload";
import { focusDocumentUrl, FocusHttpError, focusRequest, type FocusEnvironment } from "./focus-client";

export async function enqueueFocusNfce(tx: Prisma.TransactionClient, input: { arenaId: string; saleId?: string; documentType: string }) {
  if (input.documentType !== "NFC_E" || !input.saleId) throw new FocusFiscalValidationError("A integração Focus está habilitada para NFC-e de mercadorias nas comandas. Serviços precisam de NFS-e.");
  const settings = await tx.fiscalSettings.findUniqueOrThrow({ where: { arenaId: input.arenaId } });
  const tokens = settings.encryptedFocusTokens ? decryptConnectionSecrets(settings.encryptedFocusTokens) : {};
  if (!tokens[settings.environment]) throw new FocusFiscalValidationError("Cadastre o token da Focus para o ambiente selecionado.");
  const sale = await tx.sale.findFirstOrThrow({ where: { id: input.saleId, arenaId: input.arenaId }, include: { items: { include: { product: { select: { name: true, isService: true } } } }, payments: true } });
  const payload = buildFocusNfce(sale, settings, settings.environment);
  const reference = `arena-${randomUUID()}`;
  return tx.fiscalDocument.create({ data: { arenaId: input.arenaId, saleId: sale.id, provider: "FOCUS", environment: settings.environment, providerReference: reference, requestPayload: payload, direction: "OUTGOING", documentType: "NFC_E", status: "PENDING", accessKey: `PENDING-${reference}`, supplierName: sale.customerName, supplierDocument: settings.focusCnpj, totalCents: sale.totalCents, items: { create: sale.items.map((item,index) => ({ productId: item.productId, code: item.productId, description: item.product.name, ncm: payload.items[index].codigo_ncm, cfop: payload.items[index].cfop, barcode: payload.items[index].codigo_barras_comercial, unit: payload.items[index].unidade_comercial, quantity: item.quantity, totalCents: item.totalCents })) } } });
}

async function fiscalNotice(arenaId: string, id: string, status: string) {
  const db = arenaDatabase(arenaId);
  const href = `/financeiro/notas-fiscais?documentId=${encodeURIComponent(id)}#fiscal-${id}`;
  const where = { arenaId, type: "FISCAL_ISSUANCE_REVIEW", href, readAt: null };
  if (["ERROR","REJECTED","DENIED"].includes(status)) {
    const existing = await db.arenaNotification.findFirst({ where, select: { id: true } });
    if (!existing) await db.arenaNotification.create({ data: { arenaId, type: where.type, href, title: "Confira a emissão de NFC-e", message: "Uma emissão fiscal precisa de conferência. O recebimento da comanda foi preservado." } });
  } else if (["AUTHORIZED","CANCELLED"].includes(status)) await db.arenaNotification.updateMany({ where, data: { readAt: new Date() } });
}

/** Lease + stable reference + lookup before POST make retries safe after timeouts or process restarts. */
export async function dispatchFocusNfce(arenaId: string, id: string, cancelReason?: string) {
  const db = arenaDatabase(arenaId);
  const lease = new Date();
  const claimed = await db.$transaction(async tx => {
    const document = await tx.fiscalDocument.findFirst({ where: { id, arenaId, provider: "FOCUS", ...(cancelReason ? { status: "AUTHORIZED" } : { status: { in: ["PENDING", "ERROR", "PROCESSING"] } }) } });
    if (!document) return null;
    const claim = await tx.fiscalDocument.updateMany({ where: { id, arenaId, status: document.status, OR: [{ processingAt: null }, { processingAt: { lt: new Date(Date.now()-90000) } }] }, data: { processingAt: lease, attempts: { increment: 1 }, ...(!cancelReason ? { status: "PROCESSING" } : {}) } });
    if (!claim.count) return null;
    return document;
  });
  if (!claimed) return;
  try {
    const settings = await db.fiscalSettings.findUniqueOrThrow({ where: { arenaId } });
    if (settings.provider !== "FOCUS" || !settings.enabled || settings.focusCnpj !== claimed.supplierDocument) throw new Error("A configuração fiscal mudou. Confira o emitente antes de continuar.");
    const environment = claimed.environment as FocusEnvironment;
    const token = decryptConnectionSecrets(settings.encryptedFocusTokens)[environment];
    if (!token) throw new Error("Token Focus não configurado para o ambiente da nota.");
    const path = `/v2/nfce/${encodeURIComponent(claimed.providerReference)}`;
    let emittedAt = new Date(String((claimed.requestPayload as Prisma.JsonObject | null)?.data_emissao ?? claimed.createdAt.toISOString()));
    if (!Number.isFinite(emittedAt.getTime())) emittedAt = claimed.createdAt;
    let result: Record<string, unknown>;
    try { result = await focusRequest(environment, token, path); }
    catch (error) {
      if (!(error instanceof FocusHttpError) || error.status !== 404 || error.providerCode !== "nao_encontrado" || cancelReason) throw error;
      emittedAt = new Date();
      const payload = { ...(claimed.requestPayload as Prisma.JsonObject), data_emissao: emittedAt.toISOString() };
      await db.fiscalDocument.updateMany({ where: { id, arenaId, processingAt: lease }, data: { requestPayload: payload } });
      result = await focusRequest(environment, token, `/v2/nfce?ref=${encodeURIComponent(claimed.providerReference)}`, "POST", payload);
    }
    if (result.ref && result.ref !== claimed.providerReference) throw new Error("A Focus retornou referência divergente. Confira a nota no provedor.");
    if (result.cnpj_emitente && String(result.cnpj_emitente).replace(/\D/g, "") !== claimed.supplierDocument) throw new Error("A Focus retornou outro emitente. Confira a integração.");
    if (cancelReason && result.status === "autorizado") result = await focusRequest(environment, token, path, "DELETE", { justificativa: cancelReason });
    const key = String(result.chave_nfe ?? "").replace(/^NFe/, "");
    let status = result.status === "autorizado" ? "AUTHORIZED" : result.status === "cancelado" ? "CANCELLED" : result.status === "erro_autorizacao" ? "REJECTED" : result.status === "denegado" ? "DENIED" : "PROCESSING";
    if (!cancelReason && status === "AUTHORIZED" && (!/^\d{44}$/.test(key) || key.slice(6,20) !== claimed.supplierDocument)) throw new Error("Autorização sem chave fiscal válida do emitente. Consulte a Focus.");
    // A failed cancellation must never downgrade an already authorized document.
    if (cancelReason && status !== "CANCELLED") status = "AUTHORIZED";
    const message = String(result.mensagem_sefaz ?? result.status ?? "Aguardando retorno da Focus.").slice(0,1000);
    await db.fiscalDocument.updateMany({ where: { id, arenaId, processingAt: lease }, data: { status, processingAt: null, providerMessage: message, ...(!cancelReason && status === "AUTHORIZED" ? { accessKey: key, number: String(result.numero ?? ""), series: String(result.serie ?? ""), issuedAt: claimed.issuedAt ?? emittedAt, xmlUrl: focusDocumentUrl(environment,result.caminho_xml_nota_fiscal), printUrl: focusDocumentUrl(environment,result.caminho_danfe) } : {}) } });
    await fiscalNotice(arenaId, id, status).catch(() => {});
  } catch (error) {
    const message = error instanceof FocusHttpError ? error.message : error instanceof Error && /configura|emitente|referência|chave fiscal|Token Focus/.test(error.message) ? error.message : "Não foi possível confirmar o retorno da Focus. Consulte novamente; a referência da nota será preservada.";
    await db.fiscalDocument.updateMany({ where: { id, arenaId, processingAt: lease }, data: { processingAt: null, ...(!cancelReason ? { status: "ERROR" } : {}), providerMessage: message } });
    if (!cancelReason) await fiscalNotice(arenaId, id, "ERROR").catch(() => {});
  }
}
export async function dispatchComandaFiscal(arenaId: string, comandaId: string) {
  const document = await arenaDatabase(arenaId).fiscalDocument.findFirst({ where: { arenaId, provider: "FOCUS", sale: { comandaId }, status: "PENDING" }, select: { id: true } });
  if (document) await dispatchFocusNfce(arenaId, document.id);
}

export async function processPendingFocusDocuments() {
  const { prisma } = await import("@/lib/prisma");
  const arenas = await prisma.arena.findMany({ select: { id: true } });
  let processed = 0;
  for (const arena of arenas) {
    const documents = await arenaDatabase(arena.id).fiscalDocument.findMany({ where: { provider: "FOCUS", status: { in: ["PENDING","PROCESSING","ERROR"] }, attempts: { lt: 10 }, OR: [{ processingAt: null }, { processingAt: { lt: new Date(Date.now()-90000) } }], updatedAt: { lt: new Date(Date.now()-60000) } }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true } });
    for (const document of documents) { await dispatchFocusNfce(arena.id, document.id); processed++; }
  }
  return { processed };
}
