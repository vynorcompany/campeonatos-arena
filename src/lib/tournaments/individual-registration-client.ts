import { capitalizeClientName } from "@/lib/clients/name-search";
import { Prisma } from "@prisma/client";
import { normalizeBrazilianPhone } from "@/lib/phone";

export const registrationNameKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

/** Match only inside the arena, without exposing clients or overwriting an existing profile. */
export async function resolveIndividualRegistrationClient(tx: Prisma.TransactionClient, arenaId: string, name: string, phone: string, legacyCpf = "") {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  const nameKey = registrationNameKey(name);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`event-client:${arenaId}:${normalizedPhone}:${nameKey}`}, 0))`;
  const variants = [normalizedPhone, `55${normalizedPhone}`];
  if (normalizedPhone.length === 11 && normalizedPhone[2] === "9") {
    const oldPhone = normalizedPhone.slice(0, 2) + normalizedPhone.slice(3);
    variants.push(oldPhone, `55${oldPhone}`);
  }
  const candidates = await tx.$queryRaw<Array<{ id: string; name: string; phone: string; cpf: string }>>`
    SELECT id, name, phone, cpf FROM "Player" WHERE "arenaId"=${arenaId} AND "mergedIntoPlayerId" IS NULL
    AND regexp_replace(phone, '[^0-9]', '', 'g') IN (${Prisma.join(variants)}) ORDER BY "createdAt", id
  `;
  const matches = candidates.filter(player => registrationNameKey(player.name) === nameKey);
  if (matches.length > 1) throw new Error("Não foi possível identificar um cadastro único. Procure a recepção para revisar seu cadastro.");
  return matches[0] ?? tx.player.create({ data: { arenaId, name: capitalizeClientName(name), phone: normalizedPhone, cpf: legacyCpf } });
}
