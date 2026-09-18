"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyAccess, requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { configureEvolutionWebhook, createEvolutionInstance, createEvolutionInstanceName, createEvolutionInstanceToken, createEvolutionWebhookSecret, deleteEvolutionInstance, getEvolutionQrCode } from "@/lib/integrations/evolution/agency";
import { decryptConnectionSecrets, encryptConnectionSecrets, hashWebhookSecret } from "@/lib/payments/connection-secrets";

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
const whatsappConnectionSchema = z.object({ arenaId: z.string().min(1, "Arena inválida.") });

async function requireWhatsAppConnectionAccess(arenaId: string) {
  const auth = await requireRole("ADMIN");
  if (auth.arenaId !== arenaId && auth.systemRole !== "SUPER_ADMIN" && auth.systemRole !== "ADMIN") {
    throw new Error("Sem permissão para configurar o WhatsApp desta arena.");
  }
  return auth;
}

export async function connectArenaWhatsAppAction(formData: FormData) {
  const parsed = whatsappConnectionSchema.safeParse({ arenaId: formData.get("arenaId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await requireWhatsAppConnectionAccess(parsed.data.arenaId);
  const arena = await prisma.arena.findUnique({ where: { id: parsed.data.arenaId }, select: { id: true } });
  if (!arena) throw new Error("Arena não encontrada.");
  const existing = await prisma.whatsAppConnection.findUnique({ where: { arenaId: arena.id } });
  const instanceName = existing?.instanceName || createEvolutionInstanceName(arena.id);
  // "Reconectar" deliberadamente inicia uma sessão nova. Isso recupera
  // instâncias removidas ou presas em connecting pelo WhatsApp/Evolution.
  const instanceToken = createEvolutionInstanceToken();
  const webhookSecret = createEvolutionWebhookSecret();
  try {
    if (existing) await deleteEvolutionInstance(instanceName);
    const createdQr = (await createEvolutionInstance({ instanceName, instanceToken, webhookSecret })).qrCodeDataUrl;
    await configureEvolutionWebhook({ instanceName, webhookSecret });
    const qrCodeDataUrl = createdQr || await getEvolutionQrCode(instanceName, instanceToken);
    await prisma.whatsAppConnection.upsert({ where: { arenaId: arena.id }, create: { arenaId: arena.id, instanceName, encryptedToken: encryptConnectionSecrets({ token: instanceToken, webhookSecret }), webhookSecretHash: hashWebhookSecret(webhookSecret), qrCodeDataUrl, status: "AWAITING_SCAN", lastError: "" }, update: { encryptedToken: encryptConnectionSecrets({ token: instanceToken, webhookSecret }), webhookSecretHash: hashWebhookSecret(webhookSecret), qrCodeDataUrl, status: "AWAITING_SCAN", lastError: "" } });
    revalidatePath("/arena");
    revalidatePath("/agencia/conexoes");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const message = detail.includes("configurada")
      ? "A Evolution ainda não foi configurada pela agência. Informe a URL e a chave da API antes de conectar uma arena."
      : `Não foi possível preparar o QR Code na Evolution.${detail ? ` ${detail}` : " Verifique a configuração da API e tente novamente."}`;
    if (existing) await prisma.whatsAppConnection.update({ where: { id: existing.id }, data: { lastError: message } });
    return { error: message };
  }
}

export async function refreshArenaWhatsAppQrAction(formData: FormData) {
  const parsed = whatsappConnectionSchema.safeParse({ arenaId: formData.get("arenaId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await requireWhatsAppConnectionAccess(parsed.data.arenaId);
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId: parsed.data.arenaId } });
  if (!connection?.encryptedToken) throw new Error("Conecte esta arena primeiro.");
  const token = decryptConnectionSecrets(connection.encryptedToken).token;
  const webhookSecret = decryptConnectionSecrets(connection.encryptedToken).webhookSecret;
  try {
    await configureEvolutionWebhook({ instanceName: connection.instanceName, webhookSecret });
    const qrCodeDataUrl = await getEvolutionQrCode(connection.instanceName, token);
    await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { qrCodeDataUrl, status: "AWAITING_SCAN", lastError: "" } });
    revalidatePath("/arena");
    revalidatePath("/agencia/conexoes");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const message = `Não foi possível atualizar o QR Code na Evolution.${detail ? ` ${detail}` : " Verifique a conexão da API e tente novamente."}`;
    await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { lastError: message } });
    return { error: message };
  }
}

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
