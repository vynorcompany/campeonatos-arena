"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const paymentMethods = ["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "OTHER"] as const;

const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto."),
  sku: z.string().trim().max(40).default(""),
  cost: z.string().trim().min(1, "Informe o preço de custo."),
  price: z.string().trim().min(1, "Informe o preço."),
  categoryId: z.string().trim().optional().default(""),
  stockQuantity: z.coerce.number().int().min(0, "Estoque inválido.").default(0),
  minStock: z.coerce.number().int().min(0, "Estoque mínimo inválido.").default(0)
});

const stockSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().int().min(0, "Quantidade inválida."),
  reason: z.string().trim().max(120).default("")
});

const saleSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
  quantity: z.coerce.number().int().min(1, "Quantidade inválida."),
  paymentMethod: z.enum(paymentMethods),
  customerName: z.string().trim().max(80).default("")
});

const cartSaleSchema = z.object({
  items: z
    .string()
    .min(2, "Adicione pelo menos um produto.")
    .transform((value) => JSON.parse(value) as Array<{ productId: string; quantity: number }>),
  paymentMethod: z.enum(paymentMethods),
  customerName: z.string().trim().max(80).default("")
});

function refreshPosRoutes() {
  revalidatePath("/pdv");
  revalidatePath("/pdv/caixa");
  revalidatePath("/pdv/estoque");
  revalidatePath("/pdv/balanco");
  revalidatePath("/financeiro");
}

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Preço inválido.");
  }

  return Math.round(amount * 100);
}

function formatSaleCode() {
  return `SALE-${Date.now().toString(36).toUpperCase()}`;
}

export async function createProductAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    cost: formData.get("cost"),
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
    stockQuantity: formData.get("stockQuantity"),
    minStock: formData.get("minStock")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const priceCents = parseMoneyToCents(parsed.data.price);
  const costCents = parseMoneyToCents(parsed.data.cost);
  if (parsed.data.categoryId) {
    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!category) throw new Error("Categoria de produto inválida.");
  }

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        arenaId: auth.arenaId,
        createdByUserId: auth.userId,
        updatedByUserId: auth.userId,
        name: parsed.data.name,
        sku: parsed.data.sku,
        priceCents,
        costCents,
        stockQuantity: parsed.data.stockQuantity,
        minStock: parsed.data.minStock
        , categoryId: parsed.data.categoryId || null
      }
    });

    if (parsed.data.stockQuantity > 0) {
      await tx.stockMovement.create({
        data: {
          arenaId: auth.arenaId,
          productId: product.id,
          type: "IN",
          quantity: parsed.data.stockQuantity,
          reason: "Estoque inicial"
        }
      });
    }
  });

  refreshPosRoutes();
}

export async function updateProductAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const productId = String(formData.get("productId") ?? "");
  const parsed = productSchema.safeParse({
    name: formData.get("name"), sku: formData.get("sku"), cost: formData.get("cost"), price: formData.get("price"),
    stockQuantity: formData.get("stockQuantity"), minStock: formData.get("minStock"), categoryId: formData.get("categoryId")
  });
  if (!productId || !parsed.success) throw new Error(parsed.success ? "Produto inválido." : parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (parsed.data.categoryId) {
    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!category) throw new Error("Categoria de produto inválida.");
  }
  const updated = await prisma.product.updateMany({ where: { id: productId, arenaId: auth.arenaId }, data: { name: parsed.data.name, sku: parsed.data.sku, costCents: parseMoneyToCents(parsed.data.cost), priceCents: parseMoneyToCents(parsed.data.price), minStock: parsed.data.minStock, categoryId: parsed.data.categoryId || null, updatedByUserId: auth.userId } });
  if (!updated.count) throw new Error("Produto não encontrado.");
  refreshPosRoutes();
}

export async function adjustStockAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const parsed = stockSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.data.productId,
      arenaId: auth.arenaId
    }
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const nextStock =
    parsed.data.type === "ADJUST"
      ? parsed.data.quantity
      : parsed.data.type === "IN"
        ? product.stockQuantity + parsed.data.quantity
        : product.stockQuantity - parsed.data.quantity;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: product.id
      },
      data: {
        stockQuantity: nextStock
      }
    });

    await tx.stockMovement.create({
      data: {
        arenaId: auth.arenaId,
        productId: product.id,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason
      }
    });
  });

  refreshPosRoutes();
}

/**
 * Applies a physical stock count. Empty fields intentionally do nothing: this
 * lets the operator finish a balance gradually without accidentally zeroing
 * products that were not counted.
 */
export async function createStockBalanceAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 80);
  const requestedCounts = [...formData.entries()]
    .filter(([key, value]) => key.startsWith("count_") && String(value).trim() !== "")
    .map(([key, value]) => ({ productId: key.slice("count_".length), count: Number(value) }));

  if (!requestedCounts.length) {
    throw new Error("Informe a contagem de pelo menos um produto.");
  }
  if (requestedCounts.some((item) => !item.productId || !Number.isInteger(item.count) || item.count < 0)) {
    throw new Error("Cada contagem informada deve ser um número inteiro igual ou maior que zero.");
  }

  const productIds = [...new Set(requestedCounts.map((item) => item.productId))];
  if (productIds.length !== requestedCounts.length) {
    throw new Error("Há produtos repetidos no balanço.");
  }

  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId, id: { in: productIds } },
    select: { id: true, name: true, stockQuantity: true }
  });
  if (products.length !== productIds.length) {
    throw new Error("Um ou mais produtos não pertencem a esta arena.");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const stamp = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());

  await prisma.$transaction(async (tx) => {
    for (const item of requestedCounts) {
      const product = productById.get(item.productId)!;
      const difference = item.count - product.stockQuantity;
      if (!difference) continue;
      await tx.product.update({
        where: { id: product.id },
        data: { stockQuantity: item.count, updatedByUserId: auth.userId }
      });
      await tx.stockMovement.create({
        data: {
          arenaId: auth.arenaId,
          productId: product.id,
          type: "ADJUST",
          quantity: item.count,
          reason: `Balanço ${stamp} | sistema: ${product.stockQuantity} | contado: ${item.count} | diferença: ${difference >= 0 ? "+" : ""}${difference}${reason ? ` | ${reason}` : ""}`
        }
      });
    }
  });

  refreshPosRoutes();
  return { updated: requestedCounts.length };
}

export async function createSaleAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = saleSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    paymentMethod: formData.get("paymentMethod"),
    customerName: formData.get("customerName")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.data.productId,
      arenaId: auth.arenaId,
      active: true
    }
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  await createSaleFromProducts({
    arenaId: auth.arenaId,
    customerName: parsed.data.customerName,
    paymentMethod: parsed.data.paymentMethod,
    products: [{ ...product, quantity: parsed.data.quantity }]
  });

  refreshPosRoutes();
}

export async function createCartSaleAction(formData: FormData) {
  const auth = await requireModuleEdit("pos");
  const parsed = cartSaleSchema.safeParse({
    items: formData.get("items"),
    paymentMethod: formData.get("paymentMethod"),
    customerName: formData.get("customerName")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const cartItems = parsed.data.items
    .map((item) => ({
      productId: String(item.productId ?? ""),
      quantity: Number(item.quantity ?? 0)
    }))
    .filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!cartItems.length) {
    throw new Error("Adicione pelo menos um produto.");
  }

  const quantitiesByProduct = new Map<string, number>();
  for (const item of cartItems) {
    quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const products = await prisma.product.findMany({
    where: {
      arenaId: auth.arenaId,
      active: true,
      id: {
        in: [...quantitiesByProduct.keys()]
      }
    }
  });

  if (products.length !== quantitiesByProduct.size) {
    throw new Error("Um ou mais produtos não foram encontrados.");
  }

  const productsWithQuantities = products.map((product) => ({
    ...product,
    quantity: quantitiesByProduct.get(product.id) ?? 0
  }));

  await createSaleFromProducts({
    arenaId: auth.arenaId,
    customerName: parsed.data.customerName,
    paymentMethod: parsed.data.paymentMethod,
    products: productsWithQuantities
  });

  refreshPosRoutes();
}

async function createSaleFromProducts({
  arenaId,
  customerName,
  paymentMethod,
  products
}: {
  arenaId: string;
  customerName: string;
  paymentMethod: (typeof paymentMethods)[number];
  products: Array<{
    id: string;
    name: string;
    priceCents: number;
    quantity: number;
  }>;
}) {
  const totalCents = products.reduce((total, product) => total + product.priceCents * product.quantity, 0);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        arenaId,
        code: formatSaleCode(),
        customerName,
        paymentMethod,
        totalCents
      }
    });
    if (paymentMethod === "CASH") {
      const register = await tx.cashRegister.findFirst({ where: { arenaId, status: "OPEN" }, orderBy: { openedAt: "desc" } });
      if (register) {
        await tx.cashMovement.create({ data: { arenaId, registerId: register.id, type: "SALE", amountCents: totalCents, description: `Venda ${sale.code}`, createdByName: "PDV" } });
        await tx.cashRegister.update({ where: { id: register.id }, data: { expectedAmountCents: { increment: totalCents } } });
      }
    }

    for (const product of products) {
      const itemTotalCents = product.priceCents * product.quantity;

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          quantity: product.quantity,
          unitPriceCents: product.priceCents,
          totalCents: itemTotalCents
        }
      });

      await tx.product.update({
        where: {
          id: product.id
        },
        data: {
          stockQuantity: {
            decrement: product.quantity
          }
        }
      });

      await tx.stockMovement.create({
        data: {
          arenaId,
          productId: product.id,
          type: "OUT",
          quantity: product.quantity,
          reason: `Venda ${sale.code}`
        }
      });
    }
  });
}
