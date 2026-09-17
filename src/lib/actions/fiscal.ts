"use server";

import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { parseNfeXml } from "@/lib/fiscal/nfe-xml";
import { withArenaTransaction } from "@/lib/rls";

type ReconciledItem = { index: number; productId?: string; name: string; sku: string; costCents: number; priceCents: number };

function refreshFiscalRoutes() {
  revalidatePath("/financeiro/configuracoes/notas-fiscais");
  revalidatePath("/pdv");
  revalidatePath("/pdv/estoque");
}

export async function importNfeXmlAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const file = formData.get("xml");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione o XML da NF-e.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O XML excede o limite de 5 MB.");
  if (file.type && !["text/xml", "application/xml", "text/plain"].includes(file.type) && !file.name.toLowerCase().endsWith(".xml")) throw new Error("Envie um arquivo XML de NF-e.");
  const invoice = parseNfeXml(await file.text());
  let reconciledItems: ReconciledItem[] = [];
  const rawItems = formData.get("items");
  if (typeof rawItems === "string" && rawItems.trim()) {
    try { reconciledItems = JSON.parse(rawItems) as ReconciledItem[]; } catch { throw new Error("A conciliação dos produtos é inválida."); }
  }

  try {
    const result = await withArenaTransaction(auth.arenaId, async (tx) => {
      const existing = await tx.fiscalDocument.findFirst({ where: { arenaId: auth.arenaId, accessKey: invoice.accessKey }, select: { id: true } });
      if (existing) throw new Error("Esta NF-e já foi importada anteriormente.");
      const existingProducts = await tx.product.findMany({ where: { arenaId: auth.arenaId }, select: { id: true, sku: true, name: true } });
      const productBySku = new Map(existingProducts.map((product) => [product.sku, product]));
      const productByName = new Map(existingProducts.map((product) => [product.name.toLocaleLowerCase("pt-BR"), product]));
      let createdProducts = 0;
      let updatedProducts = 0;
      const itemRows: Array<{ code: string; barcode: string; description: string; ncm: string; cfop: string; unit: string; quantity: number; unitCostCents: number; totalCents: number; productId: string }> = [];

      for (const [index, item] of invoice.items.entries()) {
        const reconciled = reconciledItems.find((entry) => entry.index === index);
        if (reconciledItems.length && !reconciled) throw new Error("Concilie todos os itens da NF-e antes de confirmar.");
        const product = reconciled?.productId
          ? existingProducts.find((entry) => entry.id === reconciled.productId)
          : (item.code ? productBySku.get(item.code) : undefined) ?? productByName.get(item.description.toLocaleLowerCase("pt-BR"));
        const productName = reconciled?.name?.trim() || item.description;
        const productSku = reconciled?.sku?.trim() || item.code;
        const costCents = Number.isInteger(reconciled?.costCents) && reconciled!.costCents >= 0 ? reconciled!.costCents : item.unitCostCents;
        const priceCents = Number.isInteger(reconciled?.priceCents) && reconciled!.priceCents >= 0 ? reconciled!.priceCents : 0;
        let productId: string;
        if (!product) {
          const created = await tx.product.create({ data: { arenaId: auth.arenaId, createdByUserId: auth.userId, updatedByUserId: auth.userId, name: productName, sku: productSku, priceCents, costCents, stockQuantity: item.quantity, stockMovements: { create: { arenaId: auth.arenaId, type: "IN", quantity: item.quantity, reason: `Entrada por NF-e ${invoice.number || invoice.accessKey.slice(-9)}` } } }, select: { id: true, sku: true, name: true } });
          if (productSku) productBySku.set(productSku, created);
          productByName.set(productName.toLocaleLowerCase("pt-BR"), created);
          productId = created.id;
          createdProducts += 1;
        } else {
          await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { increment: item.quantity }, costCents, ...(priceCents ? { priceCents } : {}), updatedByUserId: auth.userId } });
          await tx.stockMovement.create({ data: { arenaId: auth.arenaId, productId: product.id, type: "IN", quantity: item.quantity, reason: `Entrada por NF-e ${invoice.number || invoice.accessKey.slice(-9)}` } });
          productId = product.id;
          updatedProducts += 1;
        }
        itemRows.push({ ...item, productId });
      }
      await tx.fiscalDocument.create({ data: { arenaId: auth.arenaId, direction: "INCOMING", status: "IMPORTED", documentType: "NFE", accessKey: invoice.accessKey, number: invoice.number, series: invoice.series, supplierName: invoice.supplierName, supplierDocument: invoice.supplierDocument, issuedAt: invoice.issuedAt, totalCents: invoice.totalCents, xmlDigest: invoice.digest, items: { create: itemRows } } });
      return { createdProducts, updatedProducts, importedItems: invoice.items.length };
    });
    refreshFiscalRoutes();
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) throw new Error("Esta NF-e já foi importada anteriormente.");
    throw error;
  }
}

export async function previewNfeXmlAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const file = formData.get("xml");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione o XML da NF-e.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O XML excede o limite de 5 MB.");
  const invoice = parseNfeXml(await file.text());
  const [duplicate, products] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.fiscalDocument.findFirst({ where: { arenaId: auth.arenaId, accessKey: invoice.accessKey }, select: { id: true } }),
    tx.product.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, sku: true, costCents: true, priceCents: true }, orderBy: { name: "asc" }, take: 1000 }),
  ]));
  if (duplicate) throw new Error("Esta NF-e já foi importada anteriormente.");
  return { invoice: { ...invoice, issuedAt: invoice.issuedAt?.toISOString() ?? null }, products };
}
