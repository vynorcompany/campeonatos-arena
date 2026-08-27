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
    stockQuantity: formData.get("stockQuantity"),
    minStock: formData.get("minStock")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const priceCents = parseMoneyToCents(parsed.data.price);
  const costCents = parseMoneyToCents(parsed.data.cost);

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
    stockQuantity: formData.get("stockQuantity"), minStock: formData.get("minStock")
  });
  if (!productId || !parsed.success) throw new Error(parsed.success ? "Produto inválido." : parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const updated = await prisma.product.updateMany({ where: { id: productId, arenaId: auth.arenaId }, data: { name: parsed.data.name, sku: parsed.data.sku, costCents: parseMoneyToCents(parsed.data.cost), priceCents: parseMoneyToCents(parsed.data.price), minStock: parsed.data.minStock, updatedByUserId: auth.userId } });
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

  if (nextStock < 0) {
    throw new Error("Estoque insuficiente.");
  }

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

  if (product.stockQuantity < parsed.data.quantity) {
    throw new Error("Estoque insuficiente para finalizar a venda.");
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

  const productsWithQuantities = products.map((product) => {
    const quantity = quantitiesByProduct.get(product.id) ?? 0;
    if (product.stockQuantity < quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}.`);
    }

    return { ...product, quantity };
  });

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
