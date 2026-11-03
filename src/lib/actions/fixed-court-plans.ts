"use server";
import { recurringBoletoIssueDeadline } from "@/lib/payments/recurring-charge-eligibility";
import { issueRecurringOnlineChargeForEntry } from "@/lib/payments/recurring-online-charges";
import { availableFixedTimes, fixedMonthAmount } from "@/lib/plans/fixed-court";
import { requireReceivingBankAccount } from "@/lib/finance/receiving-bank-account";
import { revalidatePath } from "next/cache";
import { requirePermission, requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { expandWeeklyOccurrences } from "@/lib/scheduling/recurrence";
export async function enrollFixedCourtPlanAction(form: FormData) {
    const auth = await requireModuleEdit("tv");
    await requirePermission("calendar:booking:create");
    await requirePermission("finance:receivable:create");
    const planId = String(form.get("planId") ?? ""), playerId = String(form.get("playerId") ?? "");
    const start = String(form.get("startsAt") ?? ""), end = String(form.get("endsAt") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
        return { error: "Informe início e fim do plano." };
    const from = new Date(`${start}T12:00:00Z`), until = new Date(`${end}T23:59:59-03:00`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(until.getTime()) || from.toISOString().slice(0,10)!==start || new Date(`${end}T12:00:00Z`).toISOString().slice(0,10)!==end || until < from || until.getTime() - from.getTime() > 366 * 86400000)
        return { error: "Informe um período de até um ano, com fim após o início." };
    const firstPaid=form.get("firstPaid")==="on";
    if(firstPaid) await requirePermission("finance:receivable:edit");
    const boletoIds:string[]=[];
    const requestedMethod=String(form.get("paymentMethod")??"").trim(),boleto=requestedMethod.toLowerCase()==="boleto";
    if(form.has("paymentMethod")&&!requestedMethod)return{error:"Selecione a forma de pagamento."};
    try {
        await withArenaTransaction(auth.arenaId, async (tx) => {
            const plan = await tx.sponsorshipPlan.findFirst({ where: { id: planId, arenaId: auth.arenaId, kind: "FIXED_COURT" } });
            const player = await tx.player.findFirst({ where: { id: playerId, arenaId: auth.arenaId, active: true, mergedIntoPlayerId: null } });
            if (!plan || !player) throw new Error("Selecione um plano e um cliente ativos desta arena.");
            const courtId=String(form.get("courtId")||plan.courtId||"");
            const weekday=Number(form.get("weekday")??plan.weekday??NaN),startMinute=Number(form.get("startMinute")??plan.startMinute??NaN),durationMinutes=Number(form.get("durationMinutes")||plan.durationMinutes);
            const dueDay=Number(form.get("dueDay")||plan.dueDay);
            const allowed=plan.dueDays.length?plan.dueDays:[plan.dueDay];
            if(!allowed.includes(dueDay)) throw new Error("Escolha um vencimento disponível no plano.");
            const prorate=form.has("dueDay") ? form.get("prorateFifthWeek")==="on" : plan.prorateFifthWeek;
            const court=await tx.court.findFirst({where:{id:courtId,arenaId:auth.arenaId,active:true},include:{weeklyRules:true}});
            if(!court) throw new Error("Selecione uma quadra ativa desta arena.");
            await tx.$queryRaw`SELECT id FROM "Court" WHERE id=${court.id} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
            if(!availableFixedTimes(court.weeklyRules,weekday,durationMinutes,court.onlineSlotMinutes).includes(startMinute)) throw new Error("Selecione um dia e horário disponíveis na configuração da grade.");
            let bankAccountId:string|undefined,paidAt:Date|undefined,paymentMethod=requestedMethod;
            if(firstPaid||boleto) {
              bankAccountId=await requireReceivingBankAccount(tx,auth.arenaId,form.get("bankAccountId"));
            }
            if(firstPaid) {
              const raw=String(form.get("paidAt")||"");paidAt=new Date(raw+"T12:00:00-03:00");
              if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||!Number.isFinite(paidAt.getTime())) throw new Error("Informe a data do pagamento.");
              paymentMethod=String(form.get("paymentMethod")||"");
              if((!["PIX","Dinheiro","Cartão de débito","Cartão de crédito","Boleto","BOLETO"].includes(paymentMethod)&&!await tx.paymentMethodSetting.findFirst({where:{arenaId:auth.arenaId,name:paymentMethod,active:true}}))||["CREDIT_BALANCE","Saldo de crédito"].includes(paymentMethod)) throw new Error("Selecione uma forma de pagamento válida. Para saldo, receba a mensalidade no financeiro.");
            }
            if (await tx.scheduleBookingSeries.findFirst({ where: { arenaId: auth.arenaId, sponsorshipPlanId: plan.id, responsiblePlayerId: player.id, status: "ACTIVE", startsAt: { lte: until }, endsAt: { gte: from } } }))
                throw new Error("Este cliente já possui vínculo ativo com este plano no período.");
            from.setUTCDate(from.getUTCDate() + (weekday - from.getUTCDay() + 7) % 7);
            const date = from.toISOString().slice(0, 10), time = `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}`;
            const startsAt = new Date(`${date}T${time}:00-03:00`), endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
            const occurrences = expandWeeklyOccurrences({ startsAt, endsAt, until });
            if (!occurrences.length)
                throw new Error("O período não contém o dia da semana configurado.");
            if (await tx.scheduleOccurrence.findFirst({ where: { arenaId: auth.arenaId, AND: [activeCourtOccurrenceWhere(), { OR: occurrences.map(o => ({ startsAt: { lt: o.endsAt }, endsAt: { gt: o.startsAt } })) }], occurrenceCourts: { some: { courtId: courtId } } } }))
                throw new Error("Um dos horários já está reservado ou bloqueado. Nenhum vínculo foi criado.");
            const series = await tx.scheduleBookingSeries.create({ data: { arenaId: auth.arenaId, sponsorshipPlanId: plan.id, dueDay, prorateFifthWeek:prorate, responsiblePlayerId: player.id, title: `${plan.name} · ${player.name}`, bookingTypeName: "Reserva fixa", startsAt, endsAt: occurrences.at(-1)!.endsAt, notes: "Cobrança mensal pelo plano, sem cobrança avulsa por horário." } });
            for (const o of occurrences)
                await tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, bookingSeriesId: series.id, sourceType: "BOOKING", bookingTypeName: "Reserva fixa", title: series.title, responsiblePlayerId: player.id, startsAt: o.startsAt, endsAt: o.endsAt, courtPriceCents: 0, notes: series.notes, occurrenceCourts: { create: { courtId: courtId } }, participants: { create: { playerId: player.id, amountCents: 0 } } } });
            let due = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, dueDay, 12));
            if (due < new Date(`${start}T00:00:00-03:00`))
                due.setUTCMonth(due.getUTCMonth() + 1);
            let first=true;
            do {
                const month=fixedMonthAmount(plan.monthlyAmountCents,due.getUTCFullYear(),due.getUTCMonth(),weekday,prorate);
                const isPaid=first && firstPaid && month.amountCents>0;
                const entry=await tx.financialEntry.create({ data: { arenaId: auth.arenaId, playerId: player.id, type: "REVENUE", category: "Planos de quadra", description: `${plan.name} · ${player.name}`, amountCents: month.amountCents, automaticBoleto:boleto, paymentMethod, bankAccountId, dueDate: new Date(due), competenceDate:new Date(Date.UTC(due.getUTCFullYear(),due.getUTCMonth(),1,12)), source: "FIXED_COURT_PLAN", externalReference: series.id, notes: `Reserva fixa do plano ${plan.id}; ${month.occurrences} ocorrências no mês${prorate?"; base de quatro reservas":""}.`, ...(isPaid?{status:"PAID",paidAt,paymentMethod,bankAccountId}:{}) } });
                if(boleto&&!isPaid&&due<=recurringBoletoIssueDeadline(new Date()))boletoIds.push(entry.id);
                if(isPaid) await tx.financialSettlement.create({data:{arenaId:auth.arenaId,financialEntryId:entry.id,amountCents:month.amountCents,paidAt:paidAt!,paymentMethod,bankAccountId,notes:"Primeira mensalidade recebida na adesão ao plano fixo."}});
                first=false;
                due.setUTCMonth(due.getUTCMonth() + 1);
            } while (due <= until);
        }, { timeout: 30000 });
    }
    catch (error) {
        return { error: error instanceof Error && !error.name.startsWith("Prisma") ? error.message : "Não foi possível vincular o cliente." };
    }
    for(const id of boletoIds) {try{await issueRecurringOnlineChargeForEntry(auth.arenaId,id);}catch{ /* Queue retains unconfirmed attempts for review. */ }}
    revalidatePath("/financeiro/fila-de-boletos");
    revalidatePath("/agenda");
    revalidatePath("/financeiro/contas-a-receber");
    revalidatePath(`/proximos-jogos/patrocinios/${planId}`);
    return { success: true };
}
export async function endFixedCourtPlanAction(form: FormData) {
    const auth = await requireModuleEdit("tv");
    await requirePermission("calendar:booking:cancel");
    await requirePermission("finance:receivable:edit");
    const seriesId = String(form.get("seriesId") ?? "");
    try {
        await withArenaTransaction(auth.arenaId, async (tx) => {
            const series = await tx.scheduleBookingSeries.findFirst({ where: { id: seriesId, arenaId: auth.arenaId, sponsorshipPlanId: { not: null }, status: "ACTIVE" } });
            if (!series)
                throw new Error("Vínculo já encerrado ou não encontrado.");
            const courts = await tx.scheduleOccurrenceCourt.findMany({ where: { occurrence: { arenaId: auth.arenaId, bookingSeriesId: seriesId } }, distinct: ["courtId"], select: { courtId: true } });
            for (const row of courts.sort((a, b) => a.courtId.localeCompare(b.courtId)))
                await tx.$queryRaw `SELECT id FROM "Court" WHERE id=${row.courtId} AND "arenaId"=${auth.arenaId} FOR UPDATE`;
            const now = new Date();
            const future = await tx.financialEntry.findMany({ where: { arenaId: auth.arenaId, source: "FIXED_COURT_PLAN", externalReference: seriesId, dueDate: { gte: now }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } }, include: { settlements: { select: { amountCents: true } }, onlinePaymentItems: { select: { id: true } } } });
            if (future.some(e => (!e.onlinePaymentCanceledAt && (e.onlinePaymentId || e.onlinePaymentUrl || e.onlinePaymentClaimMethod)) || e.onlinePaymentItems.length))
                throw new Error("Cancele ou concilie as cobranças online deste plano no financeiro antes de encerrar.");
            for (const entry of future)
                if (!entry.settlements.some(s => s.amountCents > 0))
                    await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "VOIDED", voidedAt: now, voidReason: "Plano fixo encerrado; mensalidade futura sem recebimento." } });
            await tx.scheduleOccurrence.updateMany({ where: { arenaId: auth.arenaId, bookingSeriesId: seriesId, startsAt: { gte: now }, status: { not: "CANCELED" } }, data: { status: "CANCELED" } });
            await tx.scheduleBookingSeries.update({ where: { id: series.id }, data: { status: "CANCELED" } });
        }, { timeout: 30000 });
    }
    catch (error) {
        return { error: error instanceof Error && !error.name.startsWith("Prisma") ? error.message : "Não foi possível encerrar o plano." };
    }
    revalidatePath("/agenda");
    revalidatePath("/proximos-jogos/patrocinios");
    revalidatePath("/financeiro/contas-a-receber");
    return { success: true };
}

export async function updateFixedCourtPlanOptionsAction(form:FormData) {
 const auth=await requireModuleEdit("tv");
 const id=String(form.get("planId")||"");
 try {
  const {planDueDays}=await import("@/lib/plans/fixed-court");
  if(!form.getAll("dueDays").length) throw new Error("Selecione ao menos um vencimento.");
  const dueDays=planDueDays(form.getAll("dueDays"));
  await withArenaTransaction(auth.arenaId,async tx=>{
   const updated=await tx.sponsorshipPlan.updateMany({where:{id,arenaId:auth.arenaId,kind:"FIXED_COURT"},data:{dueDays,dueDay:dueDays[0],prorateFifthWeek:form.get("prorateFifthWeek")==="on"}});
   if(!updated.count) throw new Error("Plano não encontrado.");
  });
 } catch(error) { return {error:error instanceof Error&&!error.name.startsWith("Prisma")?error.message:"Não foi possível atualizar o plano."}; }
 revalidatePath(`/proximos-jogos/patrocinios/${id}`);revalidatePath("/proximos-jogos/patrocinios");return {success:true};
}
