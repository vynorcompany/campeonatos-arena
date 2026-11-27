import "server-only";
import type { Prisma } from "@prisma/client";
import { matchesSearch } from "@/lib/clients/name-search";
import { decorateCompositions } from "@/lib/products/composition";
import { bookingServicesInclude, bookingServiceRows } from "@/lib/comandas/booking-service";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { comandaDebtOwnerId, listedComandaDebtWhere } from "@/lib/finance/comanda-debts";
import { arenaToday, arenaWallClockToInstant, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { withArenaTransaction } from "@/lib/rls";
import { comandaListSchema, comandaDocumentSchema, type ComandaListQuery } from "@/lib/backend/contracts/comanda-queries";
function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : arenaToday();
}

function startOfDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}


export async function resolveComandaList(arenaId: string, query: ComandaListQuery) {
  const auth = { arenaId };
  const requestedIds = [...new Set((query.ids ?? "").split(",").map(id => id.trim()).filter(Boolean))];
  const selectedDate = startOfDay(parseDate(query.date));
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const search = query.search?.trim() ?? "";
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 42);

  const commandWhere: Prisma.ComandaWhereInput = {
        arenaId: auth.arenaId,
        status: "OPEN",
        ...(requestedIds.length ? { id: { in: requestedIds } } : { OR: [{ openedAt: { gte: arenaWallClockToInstant(selectedDate), lt: arenaWallClockToInstant(nextDate) } }, { closeRequestedAt: { not: null } }] }),

      };
  const [commandRows, openComandas, players, products, paymentMethodSettings, pendingDebts, bankAccounts] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.comanda.findMany({
      where: commandWhere,
      orderBy: [{ closeRequestedAt: { sort: "asc", nulls: "last" } }, { openedAt: "desc" }, { id: "asc" }],
      include: { bookingServices: bookingServicesInclude, player: { select: { name: true, balanceMovements: { where: { kind: "MONEY" }, select: { amountCents: true } } } }, items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } }, requests: { where: { status: "PENDING" }, include: { product: { select: { name: true } }, }, orderBy: { createdAt: "desc" } } }
    }),
    tx.comanda.findMany({
      where: { arenaId: auth.arenaId, status: "OPEN", openedAt: { gte: arenaWallClockToInstant(calendarStart), lt: arenaWallClockToInstant(calendarEnd) } },
      select: { openedAt: true, playerId: true, code: true }
    }),
    tx.player.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    tx.product.findMany({ where: { arenaId: auth.arenaId, active: true, OR: [{ isService: false }, { showOnComandas: true }] }, select: { id: true, name: true, priceCents: true, stockQuantity: true, stockAggregates: true, stockChoices: true, isService: true, serviceHourly: true, category: { select: { name: true } } }, orderBy: { name: "asc" } }).then(products => decorateCompositions(tx,auth.arenaId,products)),
    tx.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    tx.financialEntry.findMany({
      where: listedComandaDebtWhere(auth.arenaId, selectedDate),
      select: {
        id: true, playerId: true, description: true, amountCents: true, dueDate: true,
        settlements: { select: { amountCents: true, interestCents: true, discountCents: true } },
        scheduleParticipant: { select: { playerId: true } },
        sale: { select: { comanda: { select: { playerId: true } } } }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
    })
    ,tx.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]));

  const comandas = commandRows.filter(command => matchesSearch(command.label, search));

  const operational = await withArenaTransaction(auth.arenaId, tx => tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { comandaCardsEnabled: true, requireFullPayment: true, preventOverpayment: true } }));
  const openRequests = await withArenaTransaction(auth.arenaId, tx => tx.arenaNotification.findMany({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, message: true, href: true } }));
  const closeRequestStats = await withArenaTransaction(auth.arenaId, tx => tx.comanda.aggregate({ where: { arenaId: auth.arenaId, status: "OPEN", closeRequestedAt: { not: null } }, _count: { id: true }, _max: { closeRequestedAt: true } }));
  const openDays = new Set(openComandas.map((comanda) => toDateInput(instantToArenaWallClock(comanda.openedAt))));
  const today = arenaToday();
  const paymentMethods = paymentMethodSettings.length ? paymentMethodSettings.map((method) => method.name).filter(name => !/^(saldo\b|credito (do cliente|em conta)\b)/.test(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase())) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito"];
  const debtsByPlayer = pendingDebts.reduce<Record<string, { id: string; description: string; amountCents: number; dueDate: Date | null }[]>>((current, debt) => {
    const playerId = comandaDebtOwnerId(debt);
    const outstandingCents = getOutstandingCents(debt.amountCents, debt.settlements);
    if (playerId && outstandingCents > 0) (current[playerId] ??= []).push({ id: debt.id, description: debt.description, amountCents: outstandingCents, dueDate: debt.dueDate });
    return current;
  }, {});

  return comandaListSchema.parse({ date:toDateInput(selectedDate),today:toDateInput(today),openDays:[...openDays],closeRequestRevision:`${closeRequestStats._count.id}:${closeRequestStats._max.closeRequestedAt?.toISOString() ?? ""}`,operational,openRequests,players,openComandas:openComandas.map(({playerId,code})=>({playerId,code})),bankAccounts,paymentMethods,
    products:products.map(({id,name,priceCents,stockQuantity,isService,serviceHourly,category,composition})=>({id,name,priceCents,stockQuantity,isService,serviceHourly,category,composition})),
    debtsByPlayer:Object.fromEntries(Object.entries(debtsByPlayer).map(([id,rows])=>[id,rows.map(row=>({...row,dueDate:row.dueDate?.toISOString()??null}))])),
    comandas:comandas.map(command=>({id:command.id,playerId:command.playerId,code:command.code,cardNumber:command.cardNumber,closeRequestedAt:command.closeRequestedAt?.toISOString()??null,label:command.label,type:command.type,openedByUserName:command.openedByUserName,bookingServices:bookingServiceRows(command.bookingServices),playerName:command.player?.name??null,clientCreditCents:Math.max(0,command.player?.balanceMovements.reduce((sum,row)=>sum+row.amountCents,0)??0),items:command.items.map(({id,quantity,unitPriceCents,totalCents,durationMinutes,compositionLabel,product})=>({id,quantity,unitPriceCents,totalCents,durationMinutes,compositionLabel,product})),requests:command.requests.map(row=>({id:row.id,quantity:row.quantity,productName:row.product.name+(row.compositionLabel?` · ${row.compositionLabel}`:"" )}))}))
  });
}

export async function resolveComandaDocument(arenaId: string, id: string, view: "detail" | "print") {
  return withArenaTransaction(arenaId, async tx => {
    const comanda = await tx.comanda.findFirst({where:{id,arenaId},select:{label:true,code:true,status:true,openedByUserName:true,bookingServices:bookingServicesInclude,items:{select:{id:true,quantity:true,totalCents:true,compositionLabel:true,product:{select:{name:true}}},orderBy:{createdAt:"asc"}}}});
    if(!comanda)return null;
    const sale=view==="detail"?await tx.sale.findFirst({where:{comandaId:id,arenaId},select:{financialEntries:{select:{id:true,amountCents:true,status:true,dueDate:true,paidAt:true}}}}):null;
    const [arena,settings]=view==="print"?await Promise.all([
      tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{name:true,legalName:true,cnpj:true,address:true,city:true,state:true,phone:true}}),
      tx.arenaOperationalSettings.findUnique({where:{arenaId},select:{printerPaper:true,printerCopies:true}}),
    ]):[null,null];
    return comandaDocumentSchema.parse({comanda:{label:comanda.label,code:comanda.code,status:comanda.status,openedByUserName:comanda.openedByUserName,items:comanda.items,financialEntries:(sale?.financialEntries??[]).map(row=>({...row,dueDate:row.dueDate?.toLocaleDateString("pt-BR")??null,paidAt:row.paidAt?.toLocaleDateString("pt-BR")??null}))},bookingServices:bookingServiceRows(comanda.bookingServices),arena,settings});
  });
}
