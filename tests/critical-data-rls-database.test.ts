import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(databaseUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("notificações do atleta podem ser filtradas pela arena proprietária", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const rollback = new Error("rollback da notificação de atleta de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const playerB = await tx.player.findFirstOrThrow({ where: { arenaId: arenaB.id }, select: { id: true } });
      const notification = await tx.playerNotification.create({ data: { playerId: playerB.id, type: "GOAL_TEST", title: "Teste descartável", message: "Teste de escopo" }, select: { id: true } });
      assert.equal(await tx.playerNotification.findFirst({ where: { id: notification.id, player: { arenaId: arenaA.id } }, select: { id: true } }), null);
      assert.equal((await tx.playerNotification.findFirst({ where: { id: notification.id, player: { arenaId: arenaB.id } }, select: { id: true } }))?.id, notification.id);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("clientes exigem contexto de arena também para leitura e gravação direta", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  try {
    const [arenaA, arenaB] = await Promise.all([
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    const [playerA, playerB] = await Promise.all([
      admin.player.findFirstOrThrow({ where: { arenaId: arenaA.id }, select: { id: true } }),
      admin.player.findFirstOrThrow({ where: { arenaId: arenaB.id }, select: { id: true } }),
    ]);
    assert.equal(await runtime.player.count(), 0);
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.player.findUnique({ where: { id: playerA.id }, select: { id: true } }))?.id, playerA.id);
      assert.equal(await tx.player.findUnique({ where: { id: playerB.id }, select: { id: true } }), null);
      assert.equal((await tx.player.updateMany({ where: { id: playerB.id }, data: { active: true } })).count, 0);
    });
    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.player.create({ data: { arenaId: arenaB.id, name: "Cliente descartável fora da arena" } });
    }));
  } finally {
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("o papel de execução não lê nem altera dados financeiros, comandas ou reservas de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do teste de isolamento");
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const entryA = await admin.financialEntry.findFirstOrThrow({ where: { arenaId: arenaA.id, type: "REVENUE" }, select: { id: true, status: true } });
    const linkedEntryA = await admin.financialEntry.findFirstOrThrow({ where: { arenaId: arenaA.id, playerId: { not: null } }, select: { id: true, playerId: true } });
    const comandaA = await admin.comanda.findFirstOrThrow({ where: { arenaId: arenaA.id }, select: { id: true, status: true } });
    const bookingA = await admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId: arenaA.id }, select: { id: true, status: true } });
    const comandaItemA = await admin.comandaItem.findFirstOrThrow({ where: { comanda: { arenaId: arenaA.id } }, select: { id: true } });
    const participantA = await admin.scheduleParticipant.findFirstOrThrow({ where: { occurrence: { arenaId: arenaA.id } }, select: { id: true } });
    const entryB = await admin.financialEntry.findFirstOrThrow({ where: { arenaId: arenaB.id }, select: { id: true } });

    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.financialEntry.findFirst({ where: { id: entryA.id }, select: { id: true } }), null);
      const playerOutsideScope = await tx.player.findFirst({ where: { id: linkedEntryA.playerId! }, include: { financialEntries: { select: { id: true } } } });
      assert.equal(playerOutsideScope, null);
      assert.equal((await tx.player.updateMany({ where: { id: linkedEntryA.playerId! }, data: { active: true } })).count, 0);
      assert.equal(await tx.comanda.findFirst({ where: { id: comandaA.id }, select: { id: true } }), null);
      assert.equal(await tx.scheduleOccurrence.findFirst({ where: { id: bookingA.id }, select: { id: true } }), null);
      assert.equal(await tx.comandaItem.findFirst({ where: { id: comandaItemA.id }, select: { id: true } }), null);
      assert.equal(await tx.scheduleParticipant.findFirst({ where: { id: participantA.id }, select: { id: true } }), null);
      assert.equal((await tx.financialEntry.findFirst({ where: { id: entryB.id }, select: { id: true } }))?.id, entryB.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const playerInsideScope = await tx.player.findFirstOrThrow({ where: { id: linkedEntryA.playerId! }, include: { financialEntries: { select: { id: true } } } });
      assert.equal(playerInsideScope.financialEntries.some((entry) => entry.id === linkedEntryA.id), true);
      await tx.financialEntry.update({ where: { id: entryA.id }, data: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: "goal-webhook-test-payment" } });
      assert.equal((await tx.financialEntry.findFirst({ where: { arenaId: arenaA.id, type: "REVENUE", onlineProvider: "MERCADO_PAGO", onlinePaymentId: "goal-webhook-test-payment" }, select: { id: true } }))?.id, entryA.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.financialEntry.findFirst({ where: { arenaId: arenaA.id, type: "REVENUE", onlineProvider: "MERCADO_PAGO", onlinePaymentId: "goal-webhook-test-payment" }, select: { id: true } }), null);
      assert.equal((await tx.financialEntry.updateMany({ where: { id: entryA.id }, data: { status: entryA.status } })).count, 0);
      assert.equal((await tx.comanda.updateMany({ where: { id: comandaA.id }, data: { status: comandaA.status } })).count, 0);
      assert.equal((await tx.scheduleOccurrence.updateMany({ where: { id: bookingA.id }, data: { status: bookingA.status } })).count, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("conversas e mensagens do WhatsApp permanecem invisíveis e imutáveis fora da arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do WhatsApp de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const conversation = await tx.whatsAppConversation.create({ data: { arenaId: arenaA.id, accountJid: "5511999999999@s.whatsapp.net", remoteJid: "5511888888888@s.whatsapp.net", contactName: "Contato descartável" } });
      const message = await tx.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: "goal-rls-whatsapp", direction: "INBOUND", body: "Mensagem descartável" } });
      assert.equal((await tx.whatsAppMessage.findFirst({ where: { id: message.id }, select: { id: true } }))?.id, message.id);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.whatsAppConversation.findFirst({ where: { id: conversation.id }, select: { id: true } }), null);
      assert.equal(await tx.whatsAppMessage.findFirst({ where: { id: message.id }, select: { id: true } }), null);
      assert.equal((await tx.whatsAppConversation.updateMany({ where: { id: conversation.id }, data: { contactName: "Alterado" } })).count, 0);
      assert.equal((await tx.whatsAppMessage.updateMany({ where: { id: message.id }, data: { body: "Alterado" } })).count, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("checkouts e itens de pagamento online ficam restritos à arena da transação", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do checkout de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const entry = await tx.financialEntry.findFirstOrThrow({ where: { arenaId: arenaA.id, playerId: { not: null } }, select: { id: true, playerId: true } });
      const checkout = await tx.onlinePaymentCheckout.create({ data: { arenaId: arenaA.id, playerId: entry.playerId!, amountCents: 100 }, include: { items: true } });
      const item = await tx.onlinePaymentCheckoutItem.create({ data: { checkoutId: checkout.id, financialEntryId: entry.id, amountCents: 100 } });
      checkout.items.push(item);
      assert.equal(checkout.items.length, 1);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.onlinePaymentCheckout.findFirst({ where: { id: checkout.id } }), null);
      assert.equal(await tx.onlinePaymentCheckoutItem.findFirst({ where: { id: checkout.items[0].id } }), null);
      assert.equal((await tx.onlinePaymentCheckout.updateMany({ where: { id: checkout.id }, data: { status: "FAILED" } })).count, 0);
      assert.equal((await tx.onlinePaymentCheckoutItem.updateMany({ where: { id: checkout.items[0].id }, data: { amountCents: 200 } })).count, 0);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.onlinePaymentCheckout.findFirst({ where: { id: checkout.id }, include: { items: true } }))?.items.length, 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
