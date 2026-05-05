"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArenaAccess } from "@/lib/auth/session";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const ticketSchema = z.object({
  title: z.string().trim().min(4, "Informe um título com pelo menos 4 caracteres."),
  category: z.enum(["BUG", "ADJUSTMENT", "QUESTION", "FINANCE", "OTHER"]).default("OTHER"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  description: z.string().trim().min(10, "Descreva melhor o que aconteceu ou o que precisa ser ajustado.")
});

const agencyTicketUpdateSchema = z.object({
  ticketId: z.string().min(1, "Ticket inválido."),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional().default("")
});

const messageSchema = z.object({
  ticketId: z.string().min(1, "Ticket inválido."),
  body: z.string().trim().min(2, "Escreva uma mensagem."),
  internal: z.string().optional().default("")
});

function refreshSupportRoutes() {
  revalidatePath("/suporte");
  revalidatePath("/agencia");
}

function formatTicketCode() {
  return `TCK-${Date.now().toString(36).toUpperCase()}`;
}

export async function createSupportTicketAction(formData: FormData) {
  const auth = await requireArenaAccess();
  const parsed = ticketSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    description: formData.get("description")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.supportTicket.create({
    data: {
      arenaId: auth.arenaId,
      requesterId: auth.userId,
      code: formatTicketCode(),
      ...parsed.data,
      messages: {
        create: {
          authorId: auth.userId,
          body: parsed.data.description
        }
      }
    }
  });

  refreshSupportRoutes();
}

export async function updateAgencyTicketAction(formData: FormData) {
  const auth = await requireAgencyAccess();
  const parsed = agencyTicketUpdateSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.supportTicket.update({
    where: {
      id: parsed.data.ticketId
    },
    data: {
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId || auth.userId,
      resolvedAt: parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED" ? new Date() : null
    }
  });

  refreshSupportRoutes();
}

export async function addSupportTicketMessageAction(formData: FormData) {
  const auth = await requireAgencyAccess();
  const parsed = messageSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
    internal: formData.get("internal")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.supportTicketMessage.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorId: auth.userId,
      body: parsed.data.body,
      internal: parsed.data.internal === "on"
    }
  });

  await prisma.supportTicket.update({
    where: {
      id: parsed.data.ticketId
    },
    data: {
      status: "IN_PROGRESS",
      assigneeId: auth.userId
    }
  });

  refreshSupportRoutes();
}
