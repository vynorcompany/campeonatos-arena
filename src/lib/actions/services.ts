"use server";
import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { z } from "zod";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(120),
  price: z.string().trim().regex(/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/, "Informe um valor válido, como 40,00.")
});
export async function saveServiceAction(form: FormData) {
  const auth = await requireModuleEdit("stock");
  const input = schema.safeParse({ id: form.get("id") || undefined, name: form.get("name"), price: form.get("price") });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Serviço inválido.");
  if (["liga", "super 12", "aula", "aula fixa", "plano", "reserva", "reserva fixa"].includes(input.data.name.toLocaleLowerCase("pt-BR"))) throw new Error("Este nome já é utilizado por um tipo padrão da grade.");
  const priceCents = Math.round(Number(input.data.price.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(priceCents) || priceCents > 2_147_483_647) throw new Error("Valor acima do limite permitido.");
  await withArenaTransaction(auth.arenaId, async tx => {
    const data = { name: input.data.name, priceCents, showOnAgenda: form.get("showOnAgenda") === "on", showOnComandas: form.get("showOnComandas") === "on", updatedByUserId: auth.userId };
    const duplicate = await tx.product.findFirst({ where: { arenaId: auth.arenaId, name: { equals: data.name, mode: "insensitive" }, ...(input.data.id ? { id: { not: input.data.id } } : {}) }, select: { id: true } });
    if (duplicate) throw new Error("Já existe um produto ou serviço com este nome.");
    if (input.data.id) {
      const service = await tx.product.findFirst({ where: { id: input.data.id, arenaId: auth.arenaId, isService: true }, select: { id: true } });
      if (!service) throw new Error("Serviço não encontrado.");
      await tx.product.update({ where: { id: service.id }, data });
    } else await tx.product.create({ data: { ...data, arenaId: auth.arenaId, isService: true, createdByUserId: auth.userId } });
  });
  for (const path of ["/pdv/servicos", "/agenda", "/comandas"]) revalidatePath(path);
}
