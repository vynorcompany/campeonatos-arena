"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { parseArenaAssistantCommand } from "@/lib/assistant/commands";
import { arenaDatabase } from "@/lib/arena-database";
import { canPerformPermission } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { arenaToday } from "@/lib/calendar/arena-wall-clock";

type AssistantReply = {
  ok: boolean;
  message: string;
  createdAt: string;
};

async function getConversation(arenaId: string, userId: string) {
  return arenaDatabase(arenaId).assistantConversation.upsert({
    where: { arenaId_userId: { arenaId, userId } },
    update: {},
    create: { arenaId, userId, title: "Assistente da Arena" }
  });
}

async function addAssistantMessage(arenaId: string, conversationId: string, content: string) {
  const message = await arenaDatabase(arenaId).assistantMessage.create({
    data: { conversationId, role: "ASSISTANT", content }
  });

  return { ok: false, message: content, createdAt: message.createdAt.toISOString() } satisfies AssistantReply;
}

export async function runArenaAssistantCommandAction(input: string): Promise<AssistantReply> {
  const auth = await requireRole("ADMIN");
  if (typeof input !== "string" || input.length > 2000) throw new Error("Use uma solicitação de até 2.000 caracteres.");
  const content = input.trim();
  if (!content) throw new Error("Digite uma solicitação para o assistente.");

  const command = parseArenaAssistantCommand(content);
  if (command && !canPerformPermission("finance:receivable:create", auth.arenaRole, auth.systemRole, auth.editPermissions)) throw new Error("Sem permissão para criar contas a receber.");
  const prisma = arenaDatabase(auth.arenaId);
  const conversation = await getConversation(auth.arenaId, auth.userId);
  await prisma.assistantMessage.create({
    data: { conversationId: conversation.id, role: "USER", content }
  });

  if (!command) {
    await prisma.assistantCommand.create({
      data: {
        arenaId: auth.arenaId,
        conversationId: conversation.id,
        requestedByUserId: auth.userId,
        type: "UNSUPPORTED",
        status: "REJECTED",
        input: content,
        output: "Comando fora do catálogo permitido."
      }
    });

    return addAssistantMessage(auth.arenaId, conversation.id, "Ainda não consigo executar esse comando. Nesta etapa, posso criar faturas a receber para clientes já cadastrados.");
  }

  const audit = await prisma.assistantCommand.create({
    data: {
      arenaId: auth.arenaId,
      conversationId: conversation.id,
      requestedByUserId: auth.userId,
      type: command.type,
      status: "PROCESSING",
      input: content
    }
  });

  const clients = await withArenaTransaction(auth.arenaId, (tx) => tx.player.findMany({
    where: {
      arenaId: auth.arenaId,
      active: true,
      name: { equals: command.clientName, mode: "insensitive" }
    },
    select: { id: true, name: true },
    take: 2
  }));

  if (clients.length !== 1) {
    const reply = clients.length
      ? `Encontrei mais de um cliente chamado ${command.clientName}. Informe o nome completo para eu criar a fatura com segurança.`
      : `Não encontrei um cliente ativo chamado ${command.clientName}. Cadastre ou confirme o nome antes de criar a fatura.`;
    await prisma.assistantCommand.update({ where: { id: audit.id }, data: { status: "NEEDS_INPUT", output: reply } });
    return addAssistantMessage(auth.arenaId, conversation.id, reply);
  }

  const client = clients[0];
  const dueDate = arenaToday();
  const result = await withArenaTransaction(auth.arenaId, async tx => {
    const current = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Player" WHERE id = ${client.id} AND "arenaId" = ${auth.arenaId} AND active = true FOR UPDATE`;
    if (!current.length) {
      const reply = "O cadastro do cliente foi alterado. Confirme o atendimento antes de criar a fatura.";
      await tx.assistantCommand.update({ where: { id: audit.id }, data: { status: "NEEDS_INPUT", output: reply } });
      const message = await tx.assistantMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } });
      return { ok: false, message: reply, createdAt: message.createdAt.toISOString() };
    }
    const entry = await tx.financialEntry.create({ data: {
      arenaId: auth.arenaId, playerId: client.id, type: "REVENUE", category: "Faturas",
      description: `Fatura criada pelo Assistente - ${client.name}`, counterpartyName: client.name,
      amountCents: command.amountCents, status: "PENDING", dueDate,
      notes: "Lançamento criado pelo Assistente da Arena.", source: "ASSISTANT", externalReference: audit.id,
    } });
    const reply = `Fatura de R$ ${(command.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} criada para ${client.name}, com vencimento hoje. Ela está em aberto no Contas a Receber.`;
    await tx.assistantCommand.update({ where: { id: audit.id }, data: { status: "EXECUTED", output: reply, targetModule: "FINANCE", targetId: entry.id, executedAt: new Date() } });
    const message = await tx.assistantMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } });
    return { ok: true, message: reply, createdAt: message.createdAt.toISOString() };
  });

  revalidatePath("/assistente");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/painel");
  return result;
}
