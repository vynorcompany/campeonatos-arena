"use server";
import { linkExistingDependent, validateGuardian } from "@/lib/clients/dependents";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAthleteDeletionRestriction } from "@/lib/athlete-management";
import { toPersistentPlayerPhoto } from "@/lib/uploads";
import { requireModuleEdit } from "@/lib/auth/guards";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { archivePlayerSchema, createClientSchema, updateClientSchema, updatePlayerPointsSchema } from "@/lib/validators/player";
import { withArenaTransaction } from "@/lib/rls";
import { normalizeCpf } from "@/lib/tournaments/inputs";
import { refreshTournamentRoutes } from "@/lib/tournament/revalidation";
import { ActionState, getPrismaMessage } from "@/lib/actions/tournament/shared";

export async function createPlayerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireModuleEdit("players");
  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    points: formData.get("points"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    cpf: normalizeCpf(String(formData.get("cpf") ?? "")),
    addressZipCode: formData.get("addressZipCode"), addressStreet: formData.get("addressStreet"), addressNumber: formData.get("addressNumber"), addressNeighborhood: formData.get("addressNeighborhood"), addressCity: formData.get("addressCity"), addressState: formData.get("addressState"),
    birthDate: formData.get("birthDate"),
    leagueTier: formData.get("leagueTier"),
    isTeacher: formData.get("isTeacher"),
    personType: formData.get("personType"), cnpj: formData.has("cnpj") ? String(formData.get("cnpj")??"").replace(/[.\/\-\s]/g, "").toUpperCase() : undefined,
    allowOverdueComandas: formData.has("allowOverdueComandas") ? formData.get("allowOverdueComandas") === "on" : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: null };
  }

  try {
    const phone = normalizeBrazilianPhone(parsed.data.phone);
    const existingPhones = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({ where: { arenaId: auth.arenaId, mergedIntoPlayerId: null }, select: { phone: true } }));
    if (phone && existingPhones.some((player) => normalizeBrazilianPhone(player.phone) === phone)) return { error: "Já existe um cliente cadastrado com este telefone.", success: null };
    const photoUrl = await toPersistentPlayerPhoto(formData.get("photo") as File | null);

    await withArenaTransaction(auth.arenaId, async (tx) => {
      const guardianId = await validateGuardian(tx, auth.arenaId, String(formData.get("guardianId") ?? ""));
      const player = await tx.player.create({
        data: {
          arenaId: auth.arenaId, guardianId,
          name: parsed.data.name,
          points: parsed.data.points,
          class: parsed.data.class,
          gender: parsed.data.gender,
          phone,
          email: parsed.data.email ?? "",
          cpf: parsed.data.cpf, personType: parsed.data.personType, cnpj: parsed.data.cnpj, allowOverdueComandas: parsed.data.allowOverdueComandas,
          addressZipCode: parsed.data.addressZipCode.replace(/\D/g, ""), addressStreet: parsed.data.addressStreet, addressNumber: parsed.data.addressNumber, addressNeighborhood: parsed.data.addressNeighborhood, addressCity: parsed.data.addressCity, addressState: parsed.data.addressState.toUpperCase(),
          birthDate: parsed.data.birthDate,
          ...(photoUrl ? { photoUrl } : {})
        }
      });

      const existingStudent = await tx.student.findFirst({
        // Somente registros legados sem cliente podem ser vinculados; nunca
        // transfira o histórico de aulas e cobranças de outro cliente homônimo.
        where: { arenaId: auth.arenaId, name: player.name, playerId: null }
      });
      if (existingStudent) {
        await tx.student.update({ where: { id: existingStudent.id }, data: { playerId: player.id, phone, email: parsed.data.email ?? "", active: true } });
      } else {
        await tx.student.create({ data: { arenaId: auth.arenaId, playerId: player.id, name: player.name, phone, email: parsed.data.email ?? "" } });
      }

      if (parsed.data.isTeacher) {
        const existingTeacher = await tx.teacher.findFirst({ where: { arenaId: auth.arenaId, name: player.name, playerId: null }, select: { id: true } });
        if (existingTeacher) {
          await tx.teacher.update({ where: { id: existingTeacher.id }, data: { playerId: player.id, phone: player.phone, email: player.email, active: true, updatedByUserId: auth.userId } });
        } else {
          await tx.teacher.create({ data: { arenaId: auth.arenaId, playerId: player.id, name: player.name, phone: player.phone, email: player.email, createdByUserId: auth.userId, updatedByUserId: auth.userId } });
        }
      }
    });
  } catch (error) {
    return { error: getPrismaMessage(error, "Não foi possível cadastrar o jogador."), success: null };
  }

  refreshTournamentRoutes();
  revalidatePath("/aulas");
  revalidatePath("/financeiro");
  return { error: null, success: "Jogador cadastrado com sucesso." };
}

export async function updatePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = updateClientSchema.safeParse({
    playerId: formData.get("playerId"),
    name: formData.get("name"),
    points: formData.get("points"),
    class: formData.get("class"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    cpf: normalizeCpf(String(formData.get("cpf") ?? "")),
    addressZipCode: formData.get("addressZipCode"), addressStreet: formData.get("addressStreet"), addressNumber: formData.get("addressNumber"), addressNeighborhood: formData.get("addressNeighborhood"), addressCity: formData.get("addressCity"), addressState: formData.get("addressState"),
    birthDate: formData.get("birthDate"),
    leagueTier: formData.get("leagueTier"),
    isTeacher: formData.get("isTeacher"),
    personType: formData.get("personType"), cnpj: formData.has("cnpj") ? String(formData.get("cnpj")??"").replace(/[.\/\-\s]/g, "").toUpperCase() : undefined,
    allowOverdueComandas: formData.has("allowOverdueComandas") ? formData.get("allowOverdueComandas") === "on" : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const phone = normalizeBrazilianPhone(parsed.data.phone);
    const existingPhones = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({ where: { arenaId: auth.arenaId, id: { not: parsed.data.playerId }, mergedIntoPlayerId: null }, select: { phone: true } }));
    if (phone && existingPhones.some((player) => normalizeBrazilianPhone(player.phone) === phone)) throw new Error("Já existe um cliente cadastrado com este telefone.");
    const photoUrl = await toPersistentPlayerPhoto(formData.get("photo") as File | null);
    await withArenaTransaction(auth.arenaId, async (tx) => {
      const guardianChange = formData.has("guardianId") ? { guardianId: await validateGuardian(tx, auth.arenaId, String(formData.get("guardianId") ?? ""), parsed.data.playerId) } : {};
      const updated = await tx.player.updateMany({
        where: { id: parsed.data.playerId, arenaId: auth.arenaId },
        data: { ...guardianChange, ...(parsed.data.personType ? { personType: parsed.data.personType } : {}), ...(parsed.data.cnpj !== undefined ? { cnpj: parsed.data.cnpj } : {}), ...(parsed.data.allowOverdueComandas !== undefined ? { allowOverdueComandas: parsed.data.allowOverdueComandas } : {}), name: parsed.data.name, points: parsed.data.points, class: parsed.data.class, gender: parsed.data.gender, phone, ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}), cpf: parsed.data.cpf, birthDate: parsed.data.birthDate, ...(parsed.data.addressZipCode !== undefined ? { addressZipCode: parsed.data.addressZipCode.replace(/\D/g, ""), addressStreet: parsed.data.addressStreet ?? "", addressNumber: parsed.data.addressNumber ?? "", addressNeighborhood: parsed.data.addressNeighborhood ?? "", addressCity: parsed.data.addressCity ?? "", addressState: (parsed.data.addressState ?? "").toUpperCase() } : {}), ...(photoUrl ? { photoUrl } : {}) }
      });
      if (!updated.count) throw new Error("Jogador não encontrado.");
      const player = await tx.player.findFirst({ where: { id: parsed.data.playerId, arenaId: auth.arenaId }, select: { name: true, phone: true, email: true } });
      if (!player) throw new Error("Jogador não encontrado.");
      const dependentId = String(formData.get("dependentPlayerId") ?? "").trim();
      if (dependentId) await linkExistingDependent(tx, auth.arenaId, parsed.data.playerId, dependentId);
      const student = await tx.student.findFirst({ where: { playerId: parsed.data.playerId, arenaId: auth.arenaId }, select: { id: true } });
      if (student) {
        await tx.student.update({ where: { id: student.id }, data: { name: player.name, phone: player.phone, email: player.email } });
      } else {
        await tx.student.create({ data: { arenaId: auth.arenaId, playerId: parsed.data.playerId, name: player.name, phone: player.phone, email: player.email } });
      }
      const teacher = await tx.teacher.findUnique({ where: { playerId: parsed.data.playerId }, select: { id: true } });
      if (parsed.data.isTeacher) {
        const standaloneTeacher = teacher ? null : await tx.teacher.findFirst({ where: { arenaId: auth.arenaId, name: player.name, playerId: null }, select: { id: true } });
        if (standaloneTeacher) {
          await tx.teacher.update({ where: { id: standaloneTeacher.id }, data: { playerId: parsed.data.playerId, phone: player.phone, email: player.email, active: true, updatedByUserId: auth.userId } });
        } else {
          await tx.teacher.upsert({
            where: { playerId: parsed.data.playerId },
            update: { name: player.name, phone: player.phone, email: player.email, active: true, updatedByUserId: auth.userId },
            create: { arenaId: auth.arenaId, playerId: parsed.data.playerId, name: player.name, phone: player.phone, email: player.email, createdByUserId: auth.userId, updatedByUserId: auth.userId }
          });
        }
      } else if (parsed.data.isTeacher === false && teacher) {
        await tx.teacher.update({ where: { id: teacher.id }, data: { active: false, updatedByUserId: auth.userId } });
      }
      const currentTier = await tx.leagueAthleteTier.findFirst({
        where: { arenaId: auth.arenaId, playerId: parsed.data.playerId, modality: "PADEL", active: true },
        orderBy: { changedAt: "desc" },
        select: { id: true, tier: true }
      });
      if (parsed.data.leagueTier !== undefined && currentTier && currentTier.tier !== parsed.data.leagueTier) {
        await tx.leagueAthleteTier.updateMany({ where: { id: currentTier.id, arenaId: auth.arenaId }, data: { active: false } });
      }
      if (parsed.data.leagueTier && currentTier?.tier !== parsed.data.leagueTier) {
        await tx.leagueAthleteTier.create({ data: { arenaId: auth.arenaId, playerId: parsed.data.playerId, modality: "PADEL", tier: parsed.data.leagueTier } });
      }
    });
  } catch (error) {
    if (error instanceof Error && ["Jogador não encontrado.", "Já existe um cliente cadastrado com este telefone.", "O cliente não pode ser responsável por si mesmo.", "Selecione um responsável ativo desta arena, sem outro responsável vinculado.", "Um responsável com dependentes não pode ser vinculado a outro responsável.", "Selecione um cliente ativo desta arena para vincular como dependente.", "Este cliente já possui outro responsável financeiro. Revise o vínculo no cadastro dele antes de alterar."].includes(error.message)) return { error: error.message };
    console.error("updatePlayerAction failed", { code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown" });
    return { error: getPrismaMessage(error, "Não foi possível atualizar o jogador.") };
  }

  refreshTournamentRoutes();
  return { error: null };
}

export async function archivePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({
    playerId: formData.get("playerId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.player.updateMany({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    data: {
      active: false
    }
  }));

  if (!updated.count) {
    throw new Error("Jogador não encontrado.");
  }

  refreshTournamentRoutes();
}

export async function reactivatePlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({ playerId: formData.get("playerId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.player.updateMany({ where: { id: parsed.data.playerId, arenaId: auth.arenaId }, data: { active: true } }));
  if (!updated.count) throw new Error("Jogador não encontrado.");
  refreshTournamentRoutes();
}

export async function deleteAthleteAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = archivePlayerSchema.safeParse({
    playerId: formData.get("playerId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const athlete = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findFirst({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    select: {
      id: true,
      _count: {
        select: {
          entries: true,
          pairPlayers: true,
          categoryPairPlayers: true
        }
      }
    }
  }));

  if (!athlete) {
    throw new Error("Atleta não encontrado.");
  }

  const restriction = getAthleteDeletionRestriction({
    tournamentEntries: athlete._count.entries,
    pairAppearances: athlete._count.pairPlayers,
    categoryPairAppearances: athlete._count.categoryPairPlayers
  });

  if (restriction) {
    throw new Error(restriction);
  }

  const deleted = await withArenaTransaction(auth.arenaId, (tx) => tx.player.deleteMany({
    where: {
      id: athlete.id,
      arenaId: auth.arenaId
    }
  }));
  if (!deleted.count) throw new Error("Atleta não encontrado.");

  refreshTournamentRoutes();
}

export async function updatePlayerPointsAction(formData: FormData) {
  const auth = await requireModuleEdit("players");
  const parsed = updatePlayerPointsSchema.safeParse({
    playerId: formData.get("playerId"),
    points: formData.get("points")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const updated = await withArenaTransaction(auth.arenaId, (tx) => tx.player.updateMany({
    where: {
      id: parsed.data.playerId,
      arenaId: auth.arenaId
    },
    data: {
      points: parsed.data.points
    }
  }));

  if (!updated.count) {
    throw new Error("Jogador não encontrado.");
  }

  refreshTournamentRoutes();
}

export async function resetPlayerRankingAction() {
  const auth = await requireModuleEdit("players");

  await withArenaTransaction(auth.arenaId, (tx) => tx.player.updateMany({
    where: {
      arenaId: auth.arenaId
    },
    data: {
      points: 0
    }
  }));

  refreshTournamentRoutes();
}
