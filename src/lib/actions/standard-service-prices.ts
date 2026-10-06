"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

const servicePriceSchema = z.object({
  serviceCode: z.enum(["LEAGUE", "SUPER12"]),
  price: z.string().trim().regex(/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/, "Informe um valor válido, como 40,00.")
});

export async function updateStandardServicePriceAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const parsed = servicePriceSchema.safeParse({ serviceCode: formData.get("serviceCode"), price: formData.get("price") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Serviço inválido.");
  const priceCents = Math.round(Number(parsed.data.price.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(priceCents) || priceCents > 2_147_483_647) throw new Error("Valor acima do limite permitido.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.arenaServicePrice.upsert({
    where: { arenaId_serviceCode: { arenaId: auth.arenaId, serviceCode: parsed.data.serviceCode } },
    create: { arenaId: auth.arenaId, serviceCode: parsed.data.serviceCode, priceCents, updatedByUserId: auth.userId },
    update: { priceCents, updatedByUserId: auth.userId }
  }));
  revalidatePath("/pdv");
  revalidatePath("/agenda");
}
