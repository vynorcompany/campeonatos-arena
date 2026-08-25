import { AthleteCreatePanel } from "@/components/players/athlete-create-panel";
import { ClientManagementWorkspace } from "@/components/players/client-management-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type PlayersPageProps = { searchParams?: { q?: string; phone?: string; financial?: string; planId?: string; active?: string; teacherId?: string } };
type Entry = { status: string; amountCents: number };

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const auth = await requireModuleView("players");
  const [players, plans, teachers] = await Promise.all([
    prisma.player.findMany({ where: { arenaId: auth.arenaId }, orderBy: { name: "asc" }, include: { student: { include: { subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" } } } }, scheduleParticipants: { include: { financialEntry: { select: { status: true, amountCents: true } }, occurrence: { select: { teacherId: true } } } }, comandas: { include: { sale: { include: { financialEntries: { select: { status: true, amountCents: true } } } } }, orderBy: { openedAt: "desc" }, take: 5 }, balanceMovements: { orderBy: { createdAt: "desc" }, take: 8 } } }),
    prisma.plan.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const phone = (searchParams?.phone ?? "").replace(/\D/g, "");
  const filtered = players.filter((player) => {
    const entries = [...player.scheduleParticipants.map((item) => item.financialEntry), ...player.comandas.flatMap((comanda) => comanda.sale?.financialEntries ?? [])].filter((entry): entry is Entry => Boolean(entry));
    const pending = entries.some((entry) => entry.status === "PENDING");
    const overdue = entries.some((entry) => entry.status === "OVERDUE");
    const planActive = player.student?.subscriptions.some((subscription) => subscription.status === "ACTIVE" && (!searchParams?.planId || subscription.planId === searchParams.planId));
    const hasTeacher = !searchParams?.teacherId || player.scheduleParticipants.some((participant) => participant.occurrence.teacherId === searchParams.teacherId);
    const financialMatch = !searchParams?.financial || searchParams.financial === "ALL" || (searchParams.financial === "CURRENT" && !pending && !overdue) || (searchParams.financial === "OPEN" && pending) || (searchParams.financial === "OVERDUE" && overdue);
    return (!query || player.name.toLowerCase().includes(query)) && (!phone || player.phone.replace(/\D/g, "").includes(phone)) && (!searchParams?.active || searchParams.active === "ALL" || (searchParams.active === "ACTIVE" ? player.active : !player.active)) && (!searchParams?.planId || Boolean(planActive)) && hasTeacher && financialMatch;
  }).map((player) => {
    const entries = [...player.scheduleParticipants.map((item) => item.financialEntry), ...player.comandas.flatMap((comanda) => comanda.sale?.financialEntries ?? [])].filter((entry): entry is Entry => Boolean(entry));
    return { id: player.id, name: player.name, phone: player.phone, cpf: player.cpf, active: player.active, financialStatus: entries.some((entry) => entry.status === "OVERDUE") ? "Em atraso" : entries.some((entry) => entry.status === "PENDING") ? "Com débitos em aberto" : "Adimplente", moneyBalanceCents: player.balanceMovements.reduce((sum, movement) => sum + movement.amountCents, 0), classBalance: player.student?.remainingClasses ?? 0, plans: player.student?.subscriptions.map((subscription) => ({ id: subscription.id, name: subscription.plan.name, status: subscription.status, startedAt: subscription.startedAt.toISOString(), endedAt: subscription.endedAt?.toISOString() ?? null, classesPerMonth: subscription.classesPerMonth, dueDay: subscription.dueDay })) ?? [], balanceMovements: player.balanceMovements.map((movement) => ({ id: movement.id, kind: movement.kind, amountCents: movement.amountCents, classesDelta: movement.classesDelta, reason: movement.reason, createdAt: movement.createdAt.toISOString() })) };
  });

  return <div className="client-management-page"><header className="client-management-header"><div><p className="eyebrow">RELACIONAMENTO</p><h1>Clientes</h1><p>Cadastros, saldos, planos e situação financeira em um único painel.</p></div><AthleteCreatePanel openLabel="Novo cliente" /></header><ClientManagementWorkspace clients={filtered} plans={plans} teachers={teachers} filters={{ q: searchParams?.q ?? "", phone: searchParams?.phone ?? "", financial: searchParams?.financial ?? "ALL", planId: searchParams?.planId ?? "", active: searchParams?.active ?? "ALL", teacherId: searchParams?.teacherId ?? "" }} /></div>;
}
