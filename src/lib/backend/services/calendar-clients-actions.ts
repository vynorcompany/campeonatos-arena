import "server-only";
import { quickClientSchema } from "@/lib/validators/player";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

export async function createQuickPlayerAction(formData: FormData) {
  const auth = await requirePermission("players:create");
  const parsed = quickClientSchema.safeParse({
    name: formData.get("name"), phone: normalizeBrazilianPhone(String(formData.get("phone") ?? "")),
    email: formData.get("email"), cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
    class: formData.get("class"), gender: formData.get("gender"), birthDate: formData.get("birthDate"),
    personType:formData.get("personType"), cnpj:String(formData.get("cnpj")??"").replace(/[.\/\-\s]/g,"").toUpperCase(), allowOverdueComandas:formData.has("allowOverdueComandas")?formData.get("allowOverdueComandas")==="on":undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const player = await withArenaTransaction(auth.arenaId, async tx => {
      await tx.$queryRaw`SELECT id FROM "Arena" WHERE id = ${auth.arenaId} FOR UPDATE`;
      const existing = await tx.player.findMany({ where: { arenaId: auth.arenaId, mergedIntoPlayerId: null }, select: { phone: true } });
      if (existing.some(player => normalizeBrazilianPhone(player.phone) === parsed.data.phone)) return null;
      return tx.player.create({ data: { arenaId: auth.arenaId, ...parsed.data } });
    });
    if (!player) return { error: "Já existe um cliente cadastrado com este telefone." };
   return { id: player.id, name: player.name };
  } catch { return { error: "Não foi possível cadastrar o cliente. Tente novamente." }; }

}
