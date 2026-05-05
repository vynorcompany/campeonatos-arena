"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const systemRoleSchema = z.object({
  userId: z.string().min(1, "Usuário inválido."),
  systemRole: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"])
});

const arenaUpdateSchema = z.object({
  arenaId: z.string().min(1, "Arena inválida."),
  name: z.string().trim().min(2, "Informe o nome da arena."),
  legalName: z.string().trim().max(120).default(""),
  cnpj: z.string().trim().max(32).default(""),
  email: z.string().trim().email("Informe um e-mail válido.").or(z.literal("")).default(""),
  phone: z.string().trim().max(32).default(""),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(32).default(""),
  agencyNotes: z.string().trim().max(600).default("")
});

const arenaStatusSchema = z.object({
  arenaId: z.string().min(1, "Arena inválida."),
  accountStatus: z.enum(["ACTIVE", "PAUSED", "CANCELED"])
});

export async function updateUserSystemRoleAction(formData: FormData) {
  const auth = await requireAgencyAccess();
  const parsed = systemRoleSchema.safeParse({
    userId: formData.get("userId"),
    systemRole: formData.get("systemRole")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  if (parsed.data.userId === auth.userId && parsed.data.systemRole === "VIEWER") {
    throw new Error("Você não pode remover seu próprio acesso de agência.");
  }

  await prisma.user.update({
    where: {
      id: parsed.data.userId
    },
    data: {
      systemRole: parsed.data.systemRole
    }
  });

  revalidatePath("/agencia");
  revalidatePath("/agencia/arenas");
  revalidatePath("/agencia/arenas/usuarios");
}

export async function updateAgencyArenaAction(formData: FormData) {
  await requireAgencyAccess();
  const parsed = arenaUpdateSchema.safeParse({
    arenaId: formData.get("arenaId"),
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    cnpj: formData.get("cnpj"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    agencyNotes: formData.get("agencyNotes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.arena.update({
    where: {
      id: parsed.data.arenaId
    },
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName,
      cnpj: parsed.data.cnpj,
      email: parsed.data.email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      state: parsed.data.state,
      agencyNotes: parsed.data.agencyNotes
    }
  });

  revalidatePath("/agencia/arenas");
}

export async function updateAgencyArenaStatusAction(formData: FormData) {
  await requireAgencyAccess();
  const parsed = arenaStatusSchema.safeParse({
    arenaId: formData.get("arenaId"),
    accountStatus: formData.get("accountStatus")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.arena.update({
    where: {
      id: parsed.data.arenaId
    },
    data: {
      accountStatus: parsed.data.accountStatus
    }
  });

  revalidatePath("/agencia");
  revalidatePath("/agencia/arenas");
}

export async function deleteAgencyArenaAction(formData: FormData) {
  await requireAgencyAccess();
  const arenaId = String(formData.get("arenaId") ?? "");

  if (!arenaId) {
    throw new Error("Arena inválida.");
  }

  await prisma.arena.delete({
    where: {
      id: arenaId
    }
  });

  revalidatePath("/agencia");
  revalidatePath("/agencia/arenas");
}
