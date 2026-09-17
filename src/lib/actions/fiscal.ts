"use server";

import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { parseNfeXml } from "@/lib/fiscal/nfe-xml";
import { withArenaTransaction } from "@/lib/rls";

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

  try {
    const result = await withArenaTransaction(auth.arenaId, async (tx) => {
      const existing = await tx.fiscalDocument.findFirst({ where: { arenaId: auth.arenaId, accessKey: invoice.accessKey }, select: { id: true } });
      if (existing) throw new Error("Esta NF-e já foi importada anteriormente.");
      const existingProducts = await tx.product.findMany({ where: { arenaId: auth.arenaId, OR: [{ sku: { in: invoice.items.map((item) => item.code).filter(Boolean) } }, { name: { in: invoice.items.map((item) => item.description) } }] }, select: { id: true, sku: true, name: true } });
      const productBySku = new Map(existingProducts.map((product) => [product.sku, product]));
      const productByName = new Map(existingProducts.map((product) => [product.name.toLocaleLowerCase("pt-BR"), product]));
      let createdProducts = 0;
      let updatedProducts = 0;
      const itemRows: Array<{ code: string; barcode: string; description: string; ncm: string; cfop: string; unit: string; quantity: number; unitCostCents: number; totalCents: number; productId: string }> = [];

      for (const item of invoice.items) {
        const product = (item.code ? productBySku.get(item.code) : undefined) ?? productByName.get(item.description.toLocaleLowerCase("pt-BR"));
        let productId: string;
        if (!product) {
          const created = await tx.product.create({ data: { arenaId: auth.arenaId, createdByUserId: auth.userId, updatedByUserId: auth.userId, name: item.description, sku: item.code, priceCents: 0, costCents: item.unitCostCents, stockQuantity: item.quantity, stockMovements: { create: { arenaId: auth.arenaId, type: "IN", quantity: item.quantity, reason: `Entrada por NF-e ${invoice.number || invoice.accessKey.slice(-9)}` } } }, select: { id: true, sku: true, name: true } });
          if (item.code) productBySku.set(item.code, created);
          productByName.set(item.description.toLocaleLowerCase("pt-BR"), created);
          productId = created.id;
          createdProducts += 1;
        } else {
          await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { increment: item.quantity }, costCents: item.unitCostCents, updatedByUserId: auth.userId } });
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
