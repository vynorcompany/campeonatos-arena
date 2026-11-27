import "server-only";
import { matchesSearch } from '@/lib/clients/name-search';
import { arenaDatabase } from '@/lib/arena-database';
import { normalizeBrazilianPhone } from '@/lib/phone';
import { clientFinancialStatus, matchesClientFinancialFilter, type ClientFinancialEntry } from '@/lib/finance/client-financial-status';
import { clientDirectoryQuerySchema, clientDirectorySchema, type ClientDirectoryQuery } from '@/lib/backend/contracts/client-directory';
type Entry = ClientFinancialEntry & { id: string };
export async function resolveClientDirectory(arenaId: string, input: ClientDirectoryQuery) {
  const searchParams = clientDirectoryQuerySchema.parse(input);
  const prisma = arenaDatabase(arenaId);
  const [players, plans, teachers, loyaltySettings, commandSettings] = await Promise.all([
    prisma.player.findMany({ where: { arenaId: arenaId, mergedIntoPlayerId: null }, orderBy: { name: "asc" }, include: { billedEntries: { where: {status:{in:["PENDING","OVERDUE","PARTIAL"]},type:{in:["REVENUE","INCOME"]}}, select:{id:true,status:true,dueDate:true} }, teacher: { select: { id: true, active: true } }, leagueAthleteTiers: { where: { active: true, modality: "PADEL" }, orderBy: { changedAt: "desc" }, take: 1, select: { tier: true } }, student: { include: { subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" } } } }, financialEntries: { where: { status: { in: ["PENDING", "OVERDUE"] }, type: { in: ["REVENUE", "INCOME"] } }, select: { id: true, status: true, dueDate: true } }, scheduleParticipants: { include: { financialEntry: { select: { id: true, status: true, dueDate: true } }, occurrence: { select: { teacherId: true } } } }, comandas: { include: { sale: { include: { financialEntries: { select: { id: true, status: true, dueDate: true } } } } }, orderBy: { openedAt: "desc" }, take: 5 }, balanceMovements: { orderBy: { createdAt: "desc" }, take: 8 } } }),
    prisma.plan.findMany({ where: { arenaId: arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.teacher.findMany({ where: { arenaId: arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.arena.findUniqueOrThrow({ where: { id: arenaId }, select: { loyaltyEnabled: true, loyaltyStartedAt: true, loyaltyVisitsRequired: true, loyaltyRewardLabel: true } }),
    prisma.arenaOperationalSettings.findUnique({where:{arenaId:arenaId},select:{blockDelinquentComandas:true}})
  ]);
  const namesById = new Map(players.map(p=>[p.id,p.name]));
  const dependentsById = new Map<string,{id:string;name:string}[]>();
  for(const p of players) if(p.guardianId) { const rows=dependentsById.get(p.guardianId)??[]; rows.push({id:p.id,name:p.name});dependentsById.set(p.guardianId,rows); }
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const phone = normalizeBrazilianPhone(searchParams?.phone ?? "");
  const entriesFor = (player: (typeof players)[number]) => [...new Map([...player.financialEntries, ...player.billedEntries, ...player.scheduleParticipants.map((item) => item.financialEntry), ...player.comandas.flatMap((comanda) => comanda.sale?.financialEntries ?? [])].filter((entry): entry is Entry => Boolean(entry)).map((entry) => [entry.id, entry] as const)).values()];
  const filtered = players.filter((player) => {
    const financialStatus = clientFinancialStatus(entriesFor(player));
    const planActive = player.student?.subscriptions.some((subscription) => subscription.status === "ACTIVE" && (!searchParams?.planId || subscription.planId === searchParams.planId));
    const hasTeacher = !searchParams?.teacherId || player.scheduleParticipants.some((participant) => participant.occurrence.teacherId === searchParams.teacherId);
    const financialMatch = matchesClientFinancialFilter(financialStatus, searchParams?.financial);
    return (!query || matchesSearch(player.name, query)) && (!phone || normalizeBrazilianPhone(player.phone).includes(phone)) && (!searchParams?.active || searchParams.active === "ALL" || (searchParams.active === "ACTIVE" ? player.active : !player.active)) && (!searchParams?.planId || Boolean(planActive)) && hasTeacher && financialMatch;
  }).map((player) => {
    return { guardianId: player.guardianId, guardianName: namesById.get(player.guardianId??"") ?? "", dependents: dependentsById.get(player.id)??[], personType: player.personType, cnpj: player.cnpj, allowOverdueComandas: player.allowOverdueComandas ?? !commandSettings?.blockDelinquentComandas, id: player.id, name: player.name, photoUrl: player.photoUrl, phone: player.phone, email: player.email, cpf: player.cpf, addressZipCode: player.addressZipCode, addressStreet: player.addressStreet, addressNumber: player.addressNumber, addressNeighborhood: player.addressNeighborhood, addressCity: player.addressCity, addressState: player.addressState, birthDate: player.birthDate?.toISOString().slice(0, 10) ?? "", gender: player.gender, class: player.class, isTeacher: Boolean(player.teacher?.active), points: player.points, leagueTier: player.leagueAthleteTiers[0]?.tier ?? "", active: player.active, financialStatus: clientFinancialStatus(entriesFor(player)), moneyBalanceCents: player.balanceMovements.reduce((sum, movement) => sum + movement.amountCents, 0), classBalance: player.student?.remainingClasses ?? 0, plans: player.student?.subscriptions.map((subscription) => ({ id: subscription.id, name: subscription.plan.name, status: subscription.status, startedAt: subscription.startedAt.toISOString(), endedAt: subscription.endedAt?.toISOString() ?? null, classesPerMonth: subscription.classesPerMonth, dueDay: subscription.dueDay })) ?? [], balanceMovements: player.balanceMovements.map((movement) => ({ id: movement.id, kind: movement.kind, amountCents: movement.amountCents, classesDelta: movement.classesDelta, reason: movement.reason, createdAt: movement.createdAt.toISOString() })) };
  });

  return clientDirectorySchema.parse({ clients: filtered, plans, teachers,
    loyaltySettings: { ...loyaltySettings, loyaltyStartedAt: loyaltySettings.loyaltyStartedAt?.toISOString() ?? null },
    guardians: players.filter(p => p.active && !p.guardianId).map(p => ({ id: p.id, name: p.name })),
    mergeClients: players.filter(player => player.active).map(({ id, name, phone, cpf, active, guardianId }) => ({ id, name, phone, cpf, active, guardianId })),
  });
}
