"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { parseArenaAssistantCommand } from "@/lib/assistant/commands";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

type AssistantReply = {
  ok: boolean;
  message: string;
  createdAt: string;
};

async function getConversation(arenaId: string, userId: string) {
  return prisma.assistantConversation.upsert({
    where: { arenaId_userId: { arenaId, userId } },
    update: {},
    create: { arenaId, userId, title: "Assistente da Arena" }
  });
}

async function addAssistantMessage(conversationId: string, content: string) {
  const message = await prisma.assistantMessage.create({
    data: { conversationId, role: "ASSISTANT", content }
  });

  return { ok: false, message: content, createdAt: message.createdAt.toISOString() } satisfies AssistantReply;
}

export async function runArenaAssistantCommandAction(input: string): Promise<AssistantReply> {
  const auth = await requireRole("ADMIN");
  const content = input.trim();
  if (!content) throw new Error("Digite uma solicitação para o assistente.");

  const conversation = await getConversation(auth.arenaId, auth.userId);
  await prisma.assistantMessage.create({
    data: { conversationId: conversation.id, role: "USER", content }
  });

  const command = parseArenaAssistantCommand(content);
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

    return addAssistantMessage(conversation.id, "Ainda não consigo executar esse comando. Nesta etapa, posso criar faturas a receber para clientes já cadastrados.");
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

  const clients = await prisma.player.findMany({
    where: {
      arenaId: auth.arenaId,
      active: true,
      name: { equals: command.clientName, mode: "insensitive" }
    },
    select: { id: true, name: true },
    take: 2
  });

  if (clients.length !== 1) {
    const reply = clients.length
      ? `Encontrei mais de um cliente chamado ${command.clientName}. Informe o nome completo para eu criar a fatura com segurança.`
      : `Não encontrei um cliente ativo chamado ${command.clientName}. Cadastre ou confirme o nome antes de criar a fatura.`;
    await prisma.assistantCommand.update({ where: { id: audit.id }, data: { status: "NEEDS_INPUT", output: reply } });
    return addAssistantMessage(conversation.id, reply);
  }

  const client = clients[0];
  const dueDate = new Date();
  dueDate.setHours(0, 0, 0, 0);
  const entry = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.create({
    data: {
      arenaId: auth.arenaId,
      type: "REVENUE",
      category: "Faturas",
      description: `Fatura criada pelo Assistente - ${client.name}`,
      counterpartyName: client.name,
      amountCents: command.amountCents,
      status: "PENDING",
      dueDate,
      notes: "Lançamento criado pelo Assistente da Arena.",
      source: "ASSISTANT",
      externalReference: audit.id
    }
  }));
  const reply = `Fatura de R$ ${(command.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} criada para ${client.name}, com vencimento hoje. Ela está em aberto no Contas a Receber.`;

  await prisma.assistantCommand.update({
    where: { id: audit.id },
    data: { status: "EXECUTED", output: reply, targetModule: "FINANCE", targetId: entry.id, executedAt: new Date() }
  });
  const message = await prisma.assistantMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } });

  revalidatePath("/assistente");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/painel");
  return { ok: true, message: reply, createdAt: message.createdAt.toISOString() };
}
