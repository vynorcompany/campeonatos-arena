import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { withArenaTransaction } from "@/lib/rls";
import { finalizePaidCourtBooking } from "@/lib/calendar/paid-booking-finalization";
import { ensureTournamentPairFromRegistration } from "@/lib/services/registration-pair";
import { env } from "@/lib/env";
import { verifyMercadoPagoWebhookSignature } from "@/lib/payments/mercado-pago-webhook-signature";
import { verifyApprovedMercadoPagoPayment } from "@/lib/payments/verified-payment";
import { sendEvolutionTextMessage } from "@/lib/integrations/evolution/client";
import { publicRegistrationApprovalAfterHold } from "@/lib/tournaments/registration-payment-hold";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId =
      String(body?.data?.id ?? "") ||
      new URL(request.url).searchParams.get("data.id") ||
      new URL(request.url).searchParams.get("id");

    // Mercado Pago validates the payment again with the arena's authenticated
    // connection below before any state changes. When the provider exposes a
    // signature secret, validate the delivery too; this remains optional for
    // legacy Checkout Bricks applications without the Webhooks dashboard.
    if (env.mercadoPagoWebhookSecret && !verifyMercadoPagoWebhookSignature({
      secret: env.mercadoPagoWebhookSecret,
      signatureHeader: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId: paymentId ?? ""
    })) {
      return NextResponse.json({ ok: false, error: "invalid_webhook_signature" }, { status: 401 });
    }

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: "missing_payment_id" });
    }
    const arenaIdHint = new URL(request.url).searchParams.get("arenaId");
    // Tanto inscrições como checkouts precisam do contexto da arena. Callbacks
    // antigos sem arenaId são procurados uma arena por vez, sem consulta global.
    const candidateArenaIds = arenaIdHint ? [arenaIdHint] : (await prisma.arena.findMany({ select: { id: true } })).map((arena) => arena.id);
    let registration: Prisma.PublicTournamentRegistrationGetPayload<{
      include: { tournament: { select: { id: true; arenaId: true } } };
    }> | null = null;
    for (const arenaId of candidateArenaIds) {
      registration = await arenaDatabase(arenaId).publicTournamentRegistration.findFirst({
        where: { mercadoPagoPaymentId: paymentId, tournament: { arenaId } },
        include: { tournament: { select: { id: true, arenaId: true } } }
      });
      if (registration) break;
    }
    const checkoutArenaIds = registration ? [registration.tournament.arenaId] : candidateArenaIds;
    let checkout: { id: string; arenaId: string } | null = null;
    for (const arenaId of checkoutArenaIds) {
      checkout = await arenaDatabase(arenaId).onlinePaymentCheckout.findFirst({ where: { mercadoPagoPaymentId: paymentId, arenaId }, select: { id: true, arenaId: true } });
      if (checkout) break;
    }
    let checkoutPayment: Record<string, unknown> | null = null;
    let checkoutPaymentArenaId: string | null = null;
    if (!checkout) {
      const arenaId = registration?.tournament.arenaId ?? arenaIdHint;
      if (arenaId) {
        const payment = await getMercadoPagoPayment(arenaId, paymentId);
        checkoutPayment = payment;
        checkoutPaymentArenaId = arenaId;
        const checkoutId = String(payment.external_reference ?? "");
        checkout = await arenaDatabase(arenaId).onlinePaymentCheckout.findFirst({ where: { id: checkoutId, arenaId }, select: { id: true, arenaId: true } });
      }
    }
    if (checkout) {
      const payment = checkoutPayment ?? await getMercadoPagoPayment(checkout.arenaId, paymentId);
      const approved = payment.status === "approved";
      await withArenaTransaction(checkout.arenaId, async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "OnlinePaymentCheckout" WHERE "id" = ${checkout!.id} AND "arenaId" = ${checkout!.arenaId} FOR UPDATE`;
        const checkoutState = await tx.onlinePaymentCheckout.findFirst({ where: { id: checkout!.id, arenaId: checkout!.arenaId }, select: { status: true } });
        const providerStatus = String(payment.status ?? "").toLowerCase();
        if (checkoutState?.status === "PAID" && ["refunded", "charged_back"].includes(providerStatus)) {
          const message = `O pagamento ${String(payment.id ?? paymentId)} do checkout ${checkout!.id} foi ${providerStatus} após a baixa financeira. Confira o estorno no Mercado Pago e concilie o caixa.`;
          const notified = await tx.arenaNotification.findFirst({ where: { arenaId: checkout!.arenaId, type: "ONLINE_PAYMENT_REVIEW", message }, select: { id: true } });
          if (!notified) await tx.arenaNotification.create({ data: { arenaId: checkout!.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Estorno após baixa exige conciliação", message, href: "/relatorios/pagamentos-online" } });
          return;
        }
        if (!checkoutState || ["PAID", "REVIEW", "REFUNDED"].includes(checkoutState.status)) return;
        // Outras formas de quitação também escrevem no lançamento. Leia saldos
        // somente depois de obter os bloqueios, sempre na mesma ordem.
        await tx.$queryRaw`SELECT "id" FROM "FinancialEntry" WHERE "arenaId" = ${checkout!.arenaId} AND "id" IN (SELECT "financialEntryId" FROM "OnlinePaymentCheckoutItem" WHERE "checkoutId" = ${checkout!.id}) ORDER BY "id" FOR UPDATE`;
        const current = await tx.onlinePaymentCheckout.findFirst({ where: { id: checkout!.id, arenaId: checkout!.arenaId }, include: { items: { include: { financialEntry: { include: { settlements: { select: { amountCents: true, interestCents: true } } } } } } } });
        if (!current) return;
        if (!approved) {
          const requiresReview = ["refunded", "charged_back"].includes(providerStatus);
          const status = requiresReview ? "REVIEW" : ["rejected", "cancelled", "canceled"].includes(providerStatus) ? "FAILED" : "PENDING";
          await tx.onlinePaymentCheckout.update({ where: { id: current.id }, data: { mercadoPagoPaymentId: String(payment.id ?? paymentId), status } });
          if (requiresReview) await tx.arenaNotification.create({ data: { arenaId: current.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento online exige conferência", message: `O pagamento ${String(payment.id ?? paymentId)} do checkout ${current.id} foi informado pelo Mercado Pago como ${providerStatus}. Confira o movimento antes de liberar outra tentativa.`, href: "/relatorios/pagamentos-online" } });
          return;
        }
        const verification = verifyApprovedMercadoPagoPayment(payment, current.amountCents, [current.id]);
        if (!verification.ok || current.items.reduce((sum, item) => sum + item.amountCents, 0) !== current.amountCents) {
          await tx.onlinePaymentCheckout.update({ where: { id: current.id }, data: { status: "REVIEW", mercadoPagoPaymentId: String(payment.id ?? paymentId) } });
          await tx.arenaNotification.create({ data: { arenaId: current.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento agrupado em análise", message: `O pagamento ${String(payment.id ?? paymentId)} não corresponde ao checkout ${current.id}: ${verification.ok ? "soma dos itens divergente" : verification.reason}. Confira no Mercado Pago antes de baixar os lançamentos.`, href: "/relatorios/pagamentos-online" } });
          return;
        }
        const alreadySettled = current.items.some((item) => {
          const entry = item.financialEntry;
          if (entry.arenaId !== current.arenaId) throw new Error("Cobrança vinculada a outra arena.");
          return !["PENDING", "OVERDUE"].includes(entry.status)
            || getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status).outstandingCents < item.amountCents;
        });
        if (alreadySettled) {
          await tx.onlinePaymentCheckout.update({ where: { id: current.id }, data: { status: "REVIEW", mercadoPagoPaymentId: String(payment.id ?? paymentId) } });
          await tx.arenaNotification.create({ data: { arenaId: current.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento já quitado em análise", message: `O pagamento ${String(payment.id ?? paymentId)} chegou após um lançamento do checkout ${current.id} ter sido quitado ou alterado. Confira a cobrança e providencie a conciliação ou o reembolso.`, href: "/relatorios/pagamentos-online" } });
          return;
        }
        const paidAt = new Date();
        const settledComandaSaleIds = new Set<string>();
        for (const item of current.items) {
          const entry = item.financialEntry;
          if (entry.arenaId !== current.arenaId) throw new Error("Cobrança vinculada a outra arena.");
          if (!["PENDING", "OVERDUE"].includes(entry.status)) continue;
          const balance = getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status);
          const amountCents = Math.min(item.amountCents, balance.outstandingCents);
          if (!amountCents) continue;
          await tx.financialSettlement.create({ data: { arenaId: current.arenaId, financialEntryId: entry.id, amountCents, paymentMethod: "Mercado Pago online", paidAt, notes: `Pagamento agrupado Mercado Pago confirmado (${String(payment.id ?? paymentId)}).` } });
          if (entry.category === "COMANDAS" && entry.saleId) {
            await tx.salePayment.create({ data: { saleId: entry.saleId, amountCents, paymentMethod: "Mercado Pago online" } });
            settledComandaSaleIds.add(entry.saleId);
          }
          const remaining = balance.outstandingCents - amountCents;
          await tx.financialEntry.update({ where: { id: entry.id }, data: { status: remaining === 0 ? "PAID" : entry.status, paidAt: remaining === 0 ? paidAt : entry.paidAt, paymentMethod: "Mercado Pago online" } });
        }
        for (const saleId of settledComandaSaleIds) {
          const sale = await tx.sale.findFirst({ where: { id: saleId, arenaId: current.arenaId }, select: { totalCents: true } });
          if (!sale) continue;
          const received = await tx.salePayment.aggregate({ where: { saleId }, _sum: { amountCents: true } });
          await tx.sale.update({ where: { id: saleId }, data: { status: (received._sum.amountCents ?? 0) >= sale.totalCents ? "PAID" : "PARTIAL" } });
        }
        await tx.onlinePaymentCheckout.update({ where: { id: current.id }, data: { status: "PAID", paidAt, mercadoPagoPaymentId: String(payment.id ?? paymentId) } });
      });
      return NextResponse.json({ ok: true });
    }
    if (!registration && arenaIdHint && checkoutPayment && checkoutPaymentArenaId === arenaIdHint) {
      // O callback pode chegar antes da gravação do paymentId na inscrição.
      // A referência vem do pagamento consultado com o token desta arena.
      const reference = String(checkoutPayment.external_reference ?? "");
      if (reference) registration = await arenaDatabase(arenaIdHint).publicTournamentRegistration.findFirst({
        where: { id: reference, tournament: { arenaId: arenaIdHint }, paymentProvider: { notIn: ["MANUAL", "FREE"] } },
        include: { tournament: { select: { id: true, arenaId: true } } }
      });
    }
    if (!registration) {
      // Current callbacks include arenaId. Legacy callbacks without it are
      // searched one arena at a time; RLS must remain active for every read.
      const candidateArenaIds = arenaIdHint ? [arenaIdHint] : (await prisma.arena.findMany({ select: { id: true } })).map((arena) => arena.id);
      let entry: { id: string; arenaId: string; externalReference: string; source: string } | null = null;
      for (const arenaId of candidateArenaIds) {
        entry = await arenaDatabase(arenaId).financialEntry.findFirst({
          where: { arenaId, onlineProvider: "MERCADO_PAGO", onlinePaymentId: paymentId, type: "REVENUE" },
          select: { id: true, arenaId: true, externalReference: true, source: true }
        });
        if (entry) break;
      }
      let resolvedPayment: Record<string, unknown> | null = entry?.arenaId === checkoutPaymentArenaId ? checkoutPayment : null;
      if (!entry) {
        const arenaId = arenaIdHint;
        if (!arenaId) return NextResponse.json({ ok: true, ignored: "unknown_payment" });
        const payment = checkoutPaymentArenaId === arenaId && checkoutPayment ? checkoutPayment : await getMercadoPagoPayment(arenaId, paymentId);
        resolvedPayment = payment;
        const reference = String(payment.external_reference ?? "");
        // Hosted Checkout creates a preference first and only receives the
        // actual payment id in this webhook. Its external reference is the
        // financial-entry id, scoped again by the arena authenticated here.
        entry = await arenaDatabase(arenaId).financialEntry.findFirst({
          where: { id: reference, arenaId, type: "REVENUE", onlineProvider: "MERCADO_PAGO" },
          select: { id: true, arenaId: true, externalReference: true, source: true }
        });
        if (entry) {
          // The standard financial settlement below handles the approved or
          // still-pending payment without falling into the booking flow.
        } else {
        const occurrenceId = reference.startsWith("online_booking:") ? reference.slice("online_booking:".length) : "";
        if (!occurrenceId || payment.status !== "approved") return NextResponse.json({ ok: true, ignored: occurrenceId ? "booking_not_approved" : "unknown_payment" });

        const bookingMessage = await withArenaTransaction(arenaId, async (tx) => {
          // A agenda bloqueia a quadra antes da reserva. Mantenha a mesma ordem
          // aqui para evitar deadlock quando edição e confirmação ocorrem juntas.
          const bookingCourts = await tx.scheduleOccurrence.findFirst({
            where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING" },
            select: { occurrenceCourts: { select: { courtId: true } } }
          });
          for (const courtId of (bookingCourts?.occurrenceCourts.map(({ courtId }) => courtId) ?? []).sort()) {
            await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${courtId} AND "arenaId" = ${arenaId} FOR UPDATE`;
          }
          await tx.$queryRaw`SELECT "id" FROM "ScheduleOccurrence" WHERE "id" = ${occurrenceId} AND "arenaId" = ${arenaId} FOR UPDATE`;
          const occurrence = await tx.scheduleOccurrence.findFirst({
            where: { id: occurrenceId, arenaId, sourceType: "ONLINE_BOOKING" },
            include: { arena: { select: { slug: true, onlineBookingWhatsappConfirmationEnabled: true } }, occurrenceCourts: { include: { court: { select: { name: true } } } }, participants: { include: { player: { select: { id: true, name: true, phone: true } } } } }
          });
          const participant = occurrence?.participants[0];
          if (!occurrence || !participant) return;
          const courtName = occurrence.occurrenceCourts[0]?.court.name ?? "Quadra";
          const paidAt = new Date();
          const receivedAmountCents = Math.round(Number(payment.transaction_amount) * 100);
          if (!Number.isSafeInteger(receivedAmountCents) || receivedAmountCents <= 0 || payment.currency_id !== "BRL") {
            throw new Error("O pagamento da reserva retornou valor ou moeda inválidos.");
          }
          const duplicatePayment = Boolean(participant.financialEntryId);
          const amountMismatch = receivedAmountCents !== participant.amountCents;
          const recorded = await tx.financialEntry.findFirst({
            where: { arenaId, onlineProvider: "MERCADO_PAGO", onlinePaymentId: String(payment.id ?? paymentId), type: "REVENUE" },
            select: { id: true }
          });
          if (recorded) return;
          const financialEntry = await tx.financialEntry.create({
            data: {
              arenaId,
              type: "REVENUE",
              category: duplicatePayment ? "Pagamento duplicado" : amountMismatch ? "Pagamento divergente" : "Reserva",
              description: `${duplicatePayment ? "Pagamento duplicado de reserva online" : amountMismatch ? "Pagamento divergente de reserva online" : "Reserva online"} · ${courtName}`,
              counterpartyName: participant.player.name,
              playerId: participant.player.id,
              amountCents: receivedAmountCents,
              dueDate: occurrence.startsAt,
              status: "PAID",
              paidAt,
              paymentMethod: "Mercado Pago online",
              source: duplicatePayment ? "ONLINE_BOOKING_DUPLICATE" : amountMismatch ? "ONLINE_BOOKING_AMOUNT_REVIEW" : "ONLINE_BOOKING",
              externalReference: occurrence.id,
              onlineProvider: "MERCADO_PAGO",
              onlinePaymentId: String(payment.id ?? paymentId),
              notes: duplicatePayment
                ? `Segunda cobrança paga para a reserva ${occurrence.id}. Verificar reembolso no Mercado Pago (${String(payment.id ?? paymentId)}).`
                : amountMismatch
                  ? `Valor pago diverge da reserva ${occurrence.id}: recebido ${receivedAmountCents} centavos; esperado ${participant.amountCents} centavos. Verificar atendimento/reembolso.`
                : `Reserva online paga via Mercado Pago (${String(payment.id ?? paymentId)}).`
            }
          });
          await tx.financialSettlement.create({ data: { arenaId, financialEntryId: financialEntry.id, amountCents: receivedAmountCents, paymentMethod: "Mercado Pago online", paidAt, notes: `Pagamento online Mercado Pago confirmado (${String(payment.id ?? paymentId)}).` } });
          if (duplicatePayment || amountMismatch) {
            await tx.arenaNotification.create({ data: { arenaId, type: "ONLINE_BOOKING_PAYMENT_REVIEW", title: duplicatePayment ? "Pagamento duplicado de reserva" : "Valor de pagamento divergente", message: duplicatePayment ? `Uma segunda cobrança foi paga para a reserva em ${courtName}. Confira o lançamento e providencie o reembolso.` : `O valor pago pela reserva em ${courtName} difere do esperado. A reserva não foi confirmada; verifique o lançamento e o atendimento/reembolso.`, href: "/financeiro/contas-a-receber" } });
            await tx.playerNotification.createMany({ data: [{ playerId: participant.player.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW", title: duplicatePayment ? "Pagamento duplicado em análise" : "Pagamento em análise", message: duplicatePayment ? "Identificamos um segundo pagamento para a mesma reserva. A arena verificará o reembolso." : "Recebemos seu pagamento, mas o valor difere do esperado. A arena verificará sua reserva ou o reembolso.", href: `/home?arena=${encodeURIComponent(occurrence.arena.slug)}&section=booking` }] });
            return null;
          }
          await tx.scheduleParticipant.update({ where: { id: participant.id }, data: { financialEntryId: financialEntry.id, paymentMethod: "Mercado Pago online" } });
          const confirmed = await finalizePaidCourtBooking(tx, arenaId, occurrence.id);
          return confirmed && occurrence.arena.onlineBookingWhatsappConfirmationEnabled && participant.player.phone ? { phone: participant.player.phone, text: `✅ Pagamento confirmado. Sua reserva em ${courtName} foi confirmada pela arena.` } : null;
        });
        if (bookingMessage) await sendEvolutionTextMessage(bookingMessage.phone, bookingMessage.text, arenaId).catch(() => undefined);
        return NextResponse.json({ ok: true });
        }
      }

      const payment = resolvedPayment ?? await getMercadoPagoPayment(entry.arenaId, paymentId);
      const approved = payment.status === "approved";
      await withArenaTransaction(entry.arenaId, async (tx) => {
        if (entry.source === "ONLINE_BOOKING" && entry.externalReference) {
          // A agenda bloqueia a quadra antes de alterar a reserva. Siga essa
          // ordem antes de bloquear o lançamento para evitar espera circular.
          const booking = await tx.scheduleOccurrence.findFirst({
            where: { id: entry.externalReference, arenaId: entry.arenaId, sourceType: "ONLINE_BOOKING" },
            select: { occurrenceCourts: { select: { courtId: true } } }
          });
          for (const courtId of Array.from(new Set(booking?.occurrenceCourts.map(({ courtId }) => courtId) ?? [])).sort()) {
            await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${courtId} AND "arenaId" = ${entry.arenaId} FOR UPDATE`;
          }
        }
        await tx.$queryRaw`SELECT "id" FROM "FinancialEntry" WHERE "id" = ${entry.id} AND "arenaId" = ${entry.arenaId} FOR UPDATE`;
        const current = await tx.financialEntry.findFirst({
          where: { id: entry.id, arenaId: entry.arenaId },
          include: { settlements: { select: { amountCents: true, interestCents: true } } }
        });
        const providerStatus = String(payment.status ?? "").toLowerCase();
        if (current?.status === "PAID" && ["refunded", "charged_back"].includes(providerStatus)) {
          const message = `O pagamento ${String(payment.id ?? paymentId)} do lançamento ${current.id} foi ${providerStatus} após a baixa. Confira o estorno no Mercado Pago e concilie o caixa${current.source === "ONLINE_BOOKING" ? " e a reserva" : ""}.`;
          const notified = await tx.arenaNotification.findFirst({ where: { arenaId: entry.arenaId, type: "ONLINE_PAYMENT_REVIEW", message }, select: { id: true } });
          if (!notified) await tx.arenaNotification.create({ data: { arenaId: entry.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Estorno após baixa exige conciliação", message, href: "/relatorios/pagamentos-online" } });
          return;
        }
        // A cobrança continua válida quando o vencimento já passou. O mesmo
        // lançamento que gerou a cobrança é a única conta baixada aqui.
        if (!current || !["PENDING", "OVERDUE"].includes(current.status)) return;
        if (!approved) {
          await tx.financialEntry.update({ where: { id: current.id }, data: { onlinePaymentId: String(payment.id ?? paymentId) } });
          return;
        }
        const balance = getFinancialEntryBalance(current.amountCents, current.settlements, current.status);
        if (!balance.outstandingCents) return;
        const references = current.source === "ONLINE_BOOKING" && current.externalReference
          ? [current.id, `online_booking:${current.externalReference}`]
          : [current.id];
        const verification = verifyApprovedMercadoPagoPayment(payment, balance.outstandingCents, references);
        if (!verification.ok) {
          const reviewMarker = `[MP_REVIEW:${String(payment.id ?? paymentId)}]`;
          if (!current.notes.includes(reviewMarker)) {
            await tx.financialEntry.update({ where: { id: current.id }, data: { notes: `${current.notes}\n${reviewMarker} ${verification.reason}`.trim(), onlinePaymentId: String(payment.id ?? paymentId) } });
            await tx.arenaNotification.create({ data: { arenaId: entry.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento de lançamento em análise", message: `O pagamento ${String(payment.id ?? paymentId)} não corresponde ao lançamento ${current.id}: ${verification.reason}. Confira no Mercado Pago antes de baixar o valor.`, href: "/financeiro/contas-a-receber" } });
          }
          return;
        }
        await tx.financialSettlement.create({
          data: {
            arenaId: entry.arenaId,
            financialEntryId: current.id,
            amountCents: balance.outstandingCents,
            paymentMethod: current.onlinePaymentUrl ? "Mercado Pago online" : "Mercado Pago",
            paidAt: new Date(),
            notes: `Pagamento online Mercado Pago confirmado (${String(payment.id ?? paymentId)}).`
          }
        });
        await tx.financialEntry.update({
          where: { id: current.id },
          data: { status: "PAID", paidAt: new Date(), paymentMethod: "Mercado Pago online", onlinePaymentId: String(payment.id ?? paymentId) }
        });
        if (current.source === "ONLINE_BOOKING" && current.externalReference) {
          await finalizePaidCourtBooking(tx, entry.arenaId, current.externalReference);
        }
      });
      return NextResponse.json({ ok: true });
    }

    const payment = registration.tournament.arenaId === checkoutPaymentArenaId && checkoutPayment
      ? checkoutPayment
      : await getMercadoPagoPayment(registration.tournament.arenaId, paymentId);
    const approved = payment.status === "approved";
    await withArenaTransaction(registration.tournament.arenaId, async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PublicTournamentRegistration" WHERE "id" = ${registration.id} AND "tournamentId" = ${registration.tournament.id} FOR UPDATE`;
      const current = await tx.publicTournamentRegistration.findFirst({ where: { id: registration.id, tournamentId: registration.tournament.id }, select: { paymentStatus: true, status: true, amountCents: true, holdExpiresAt: true, mercadoPagoPaymentId: true, paymentProvider: true, paymentReference: true, paymentQrCode: true, paymentCheckoutUrl: true } });
      const legacyCheckoutPreference = current?.paymentStatus === "PENDING"
        && current.paymentProvider === "MERCADO_PAGO"
        && current.paymentReference === current.mercadoPagoPaymentId
        && !current.paymentQrCode
        && Boolean(current.paymentCheckoutUrl);
      if (current?.mercadoPagoPaymentId && current.mercadoPagoPaymentId !== paymentId && !legacyCheckoutPreference) {
        if (approved) {
          const message = `O pagamento ${paymentId} chegou para a inscrição ${registration.id}, que já possui outra cobrança vinculada (${current.mercadoPagoPaymentId}). Confira se houve pagamento duplicado e providencie atendimento ou estorno.`;
          const notified = await tx.arenaNotification.findFirst({ where: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", message }, select: { id: true } });
          if (!notified) await tx.arenaNotification.create({ data: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Possível pagamento duplicado de inscrição", message, href: `/torneios/${registration.tournament.id}/inscricoes` } });
        }
        return;
      }
      const providerStatus = String(payment.status ?? "").toLowerCase();
      if (current?.paymentStatus === "PAID" && ["refunded", "charged_back"].includes(providerStatus)) {
        const message = `O pagamento ${String(payment.id ?? paymentId)} da inscrição ${registration.id} foi ${providerStatus} após a confirmação da dupla. Confira o estorno no Mercado Pago e concilie a inscrição antes de alterar jogos ou resultados.`;
        const notified = await tx.arenaNotification.findFirst({ where: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", message }, select: { id: true } });
        if (!notified) await tx.arenaNotification.create({ data: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Estorno de inscrição confirmada exige conciliação", message, href: `/torneios/${registration.tournament.id}/inscricoes` } });
        return;
      }
      if (!current || ["PAID", "REVIEW", "REFUNDED"].includes(current.paymentStatus) || current.status === "CONFIRMED") return;
      if (current.status === "CANCELED") {
        if (approved) {
          await tx.publicTournamentRegistration.update({ where: { id: registration.id }, data: { paymentStatus: "REVIEW", mercadoPagoPaymentId: String(payment.id ?? paymentId), paymentReference: String(payment.id ?? paymentId) } });
          await tx.arenaNotification.create({ data: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento recebido após cancelamento", message: `O pagamento ${String(payment.id ?? paymentId)} chegou após o cancelamento da inscrição ${registration.id}. A dupla não foi confirmada; confira o estorno no Mercado Pago.`, href: "/relatorios/pagamentos-online" } });
        }
        return;
      }
      if (approved && publicRegistrationApprovalAfterHold(current.holdExpiresAt, payment.date_approved)) {
        await tx.publicTournamentRegistration.update({
          where: { id: registration.id },
          data: { status: "CANCELED", paymentStatus: "REVIEW", mercadoPagoPaymentId: String(payment.id ?? paymentId), paymentReference: String(payment.id ?? paymentId) }
        });
        await tx.arenaNotification.create({ data: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento após o prazo da inscrição", message: `O pagamento ${String(payment.id ?? paymentId)} foi aprovado após o prazo da inscrição ${registration.id}. A dupla não foi confirmada; confira a cobrança e o estorno no Mercado Pago.`, href: `/torneios/${registration.tournament.id}/inscricoes` } });
        return;
      }
      if (approved) {
        const verification = verifyApprovedMercadoPagoPayment(payment, current.amountCents, [registration.id]);
        if (!verification.ok) {
          await tx.publicTournamentRegistration.update({ where: { id: registration.id }, data: { paymentStatus: "REVIEW", mercadoPagoPaymentId: String(payment.id ?? paymentId), paymentReference: String(payment.id ?? paymentId) } });
          await tx.arenaNotification.create({ data: { arenaId: registration.tournament.arenaId, type: "ONLINE_PAYMENT_REVIEW", title: "Pagamento de inscrição em análise", message: `O pagamento ${String(payment.id ?? paymentId)} não corresponde à inscrição ${registration.id}: ${verification.reason}. Confira antes de confirmar a dupla.`, href: "/torneios" } });
          return;
        }
      }
      await tx.publicTournamentRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: approved ? "PAID" : String(payment.status ?? "PENDING"),
          status: approved ? "CONFIRMED" : "PENDING_PAYMENT",
          mercadoPagoPaymentId: String(payment.id ?? paymentId),
          paymentReference: String(payment.id ?? paymentId)
        }
      });

      if (approved) {
        await ensureTournamentPairFromRegistration(tx, {
          arenaId: registration.tournament.arenaId,
          tournamentId: registration.tournament.id,
          leadName: registration.leadName,
          partnerName: registration.partnerName,
          leadCpf: registration.leadCpf,
          partnerCpf: registration.partnerCpf
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mercado Pago webhook processing failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { ok: false, error: "webhook_processing_failed" },
      { status: 500 }
    );
  }
}
