import type { DashboardMetricCard } from "@/components/dashboard-metric-cards";
import { isActiveCourtOccurrence } from "@/lib/calendar/online-booking-hold";
import { formatOccupancy } from "@/lib/reports/reservation-insights";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { arenaToday } from "@/lib/calendar/arena-wall-clock";
import { allocateDashboardCourts, dashboardCourtOccupancy, dashboardDateKey, dashboardPercent, projectDashboardAmounts, type ProjectedAmount } from "./dashboard-projections";
import { dashboardFinancialRows, type loadDashboardData } from "./dashboard-data";

export const dashboardMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
export const dashboardRate = (value: number | null) => value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
type Data = Awaited<ReturnType<typeof loadDashboardData>>;
export type DashboardBreakdown = { id: string; name: string; value: number };
const sum = <T,>(items: T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0);
const grouped = (items: DashboardBreakdown[]) => [...items.reduce((map, item) => { const previous = map.get(item.id); map.set(item.id, { ...item, value: item.value + (previous?.value ?? 0) }); return map; }, new Map<string, DashboardBreakdown>()).values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
const comparison = (current: number, previous: number) => previous ? (current - previous) / Math.abs(previous) * 100 : current ? 100 : 0;

export function buildDashboardAnalytics(data: Data, from: Date, to: Date, horizonEnd: Date, view: "caixa" | "competencia", previous?: { from: Date; to: Date }, now = new Date()) {
  const within = (date: Date) => date >= from && date <= to;
  const rows = dashboardFinancialRows(data.entries, view, from, to);
  const receipts = dashboardFinancialRows(data.entries, "caixa", from, to).filter(row => row.type === "REVENUE");
  const prior = previous ? dashboardFinancialRows(data.previousEntries, view, previous.from, previous.to) : [];
  const received = sum(rows.filter(row => row.type === "REVENUE"), row => row.value);
  const paid = sum(rows.filter(row => row.type === "EXPENSE"), row => row.value);
  const previousReceived = sum(prior.filter(row => row.type === "REVENUE"), row => row.value);
  const previousPaid = sum(prior.filter(row => row.type === "EXPENSE"), row => row.value);
  const active = data.occurrences.filter(item => item.bookingTypeName !== "Bloqueio" && isActiveCourtOccurrence(item, now));
  const isLesson = (item: { sourceType: string; bookingTypeName: string }) => ["LESSON", "LESSON_MAKEUP"].includes(item.sourceType) || /aula|reposi[çc][aã]o/i.test(item.bookingTypeName);
  const scheduled = active.filter(item => item.startsAt <= to && item.endsAt > from);
  const reservations = scheduled.filter(item => !isLesson(item));
  const cancelled = data.occurrences.filter(item => item.bookingTypeName !== "Bloqueio" && !isLesson(item) && item.startsAt <= to && item.endsAt > from && ["CANCELED", "CANCELLED"].includes(item.status));
  const fixed = reservations.filter(item => item.bookingSeriesId || /fix[ao]/i.test(item.bookingTypeName));
  const uncharged = reservations.filter(item => item.participants.every(participant => participant.amountCents <= 0 || participant.financialEntry?.status === "VOIDED"));
  const occupancy = dashboardCourtOccupancy(data.courts, scheduled, from, to);
  const amounts = projectDashboardAmounts(data.entries, data.recurrences, from, horizonEnd);
  for (const occurrence of active) for (const participant of occurrence.participants) {
    if (participant.financialEntryId || participant.amountCents <= 0 || occurrence.startsAt < from || occurrence.startsAt > horizonEnd) continue;
    amounts.push({ id: `booking:${participant.id}`, type: "REVENUE", amountCents: participant.amountCents, outstandingCents: participant.paymentMethod ? 0 : participant.amountCents, date: occurrence.startsAt, description: occurrence.title, counterpartyName: participant.player.name, playerId: participant.playerId, projected: true });
  }
  const selectedForecast = amounts.filter(item => within(item.date));
  const forecastRevenue = selectedForecast.filter(item => item.type === "REVENUE");
  const forecastTotal = sum(forecastRevenue, item => item.amountCents);
  const toReceive = sum(forecastRevenue, item => item.outstandingCents);
  const today = arenaToday(now);
  const matured = data.entries.filter(entry => entry.type === "REVENUE" && entry.status !== "VOIDED" && entry.dueDate && within(entry.dueDate) && entry.dueDate < today);
  const overdue = matured.filter(entry => entry.status !== "PAID" && getOutstandingCents(entry.amountCents, entry.settlements) > 0);
  const overdueTotal = sum(overdue, entry => getOutstandingCents(entry.amountCents, entry.settlements));
  const overdueBase = sum(matured, entry => entry.amountCents + sum(entry.settlements, settlement => settlement.interestCents));
  const clients = grouped(receipts.filter(row => row.playerId || row.counterpartyName !== "Cliente não identificado").map(row => ({ id: row.playerId || `name:${row.counterpartyName.trim().toLocaleLowerCase("pt-BR")}`, name: row.counterpartyName, value: row.value })));
  const debtors = grouped(overdue.map(entry => ({ id: entry.playerId || `name:${entry.counterpartyName.trim().toLocaleLowerCase("pt-BR")}`, name: entry.player?.name || entry.counterpartyName || "Cliente não identificado", value: getOutstandingCents(entry.amountCents, entry.settlements) })));
  const activeClients = new Map<string, string>();
  scheduled.forEach(reservation => reservation.participants.forEach(participant => activeClients.set(participant.playerId, participant.player.name)));
  data.lessons.forEach(lesson => lesson.attendances.filter(attendance => attendance.status === "PRESENT").forEach(attendance => activeClients.set(attendance.student.playerId || `student:${attendance.studentId}`, attendance.student.name)));
  const identifiedClients = clients.filter(client => !client.id.startsWith("name:"));
  identifiedClients.forEach(client => activeClients.set(client.id, client.name));
  const lessonOccurrences = scheduled.filter(isLesson);
  const fixedLessons = lessonOccurrences.filter(item => item.bookingSeriesId || /fix[ao]/i.test(item.bookingTypeName));
  const lessonRows = [...lessonOccurrences.map(item => ({ id: item.id, title: item.title, subtitle: item.teacher?.name || "Sem professor", date: dashboardDateKey(item.startsAt) })), ...data.lessons.map(item => ({ id: item.id, title: item.title, subtitle: item.teacher?.name || "Sem professor", date: item.scheduledAt ? dashboardDateKey(item.scheduledAt) : undefined }))];
  const lessonsByTeacher = grouped([...lessonOccurrences.map(item => ({ id: item.teacherId || "unknown", name: item.teacher?.name || "Sem professor", value: 1 })), ...data.lessons.map(item => ({ id: item.teacherId || "unknown", name: item.teacher?.name || "Sem professor", value: 1 }))]);
  const productMap = new Map(data.products.filter(product => !product.isService).map(product => [product.id, product]));
  const productSales = data.saleGroups.flatMap(group => { const product = productMap.get(group.productId); return product ? [{ id: product.id, name: product.name, quantity: group._sum.quantity ?? 0, revenue: group._sum.totalCents ?? 0, cost: (group._sum.quantity ?? 0) * product.costCents }] : []; });
  const productRevenue = sum(productSales, item => item.revenue), productProfit = productRevenue - sum(productSales, item => item.cost);
  const financialItems = (type: string) => rows.filter(row => row.type === type).map(row => ({ id: row.id, title: row.description, subtitle: row.counterpartyName, value: dashboardMoney(row.value), tone: type === "EXPENSE" ? "negative" as const : "positive" as const, date: dashboardDateKey(row.date) }));
  const bookingItems = (items: typeof reservations) => items.map(item => ({ id: item.id, title: item.title, subtitle: item.occurrenceCourts.map(relation => relation.court.name).join(" · "), date: dashboardDateKey(item.startsAt), tone: "positive" as const, value: dashboardMoney(sum(item.participants, participant => participant.amountCents)) }));
  const projectedItems = (items: ProjectedAmount[]) => items.map(item => ({ id: item.id, title: item.description, subtitle: `${item.counterpartyName}${item.projected ? " · Previsto, ainda não lançado" : ""}`, value: dashboardMoney(item.outstandingCents), tone: "positive" as const, date: dashboardDateKey(item.date) }));
  const cards: DashboardMetricCard[] = [
    { id: "income", tone: "positive", label: "Entradas", value: dashboardMoney(received), caption: view === "caixa" ? "Recebimentos no período" : "Receitas por vencimento", comparison: previous && previousReceived !== 0 ? { percent: comparison(received, previousReceived) } : undefined, title: "Entradas no período", description: "Caixa considera pagamentos e baixas parciais; competência considera o vencimento dos lançamentos.", emptyMessage: "Nenhuma entrada no período.", items: financialItems("REVENUE") },
    { id: "expense", tone: "negative", label: "Saídas", value: dashboardMoney(paid), caption: view === "caixa" ? "Pagamentos no período" : "Despesas por vencimento", comparison: previous && previousPaid !== 0 ? { percent: comparison(paid, previousPaid), favorable: "down" } : undefined, title: "Saídas no período", description: "Despesas na visualização selecionada.", emptyMessage: "Nenhuma saída no período.", items: financialItems("EXPENSE") },
    { id: "result", label: "Resultado", value: dashboardMoney(received - paid), tone: received - paid > 0 ? "positive" : received - paid < 0 ? "negative" : "neutral", caption: "Entradas menos saídas", comparison: previous && previousReceived - previousPaid !== 0 ? { percent: comparison(received - paid, previousReceived - previousPaid) } : undefined, title: "Composição do resultado", description: "Resultado financeiro do período, sem incluir valores previstos ainda não lançados.", emptyMessage: "Sem movimentação.", items: [{ id: "income", title: "Entradas", tone: "positive", value: dashboardMoney(received) }, { id: "expense", title: "Saídas", tone: "negative", value: dashboardMoney(paid) }] },
    { id: "to-receive", tone: "positive", label: "Saldo a entrar", value: dashboardMoney(toReceive), caption: "Em aberto + recorrências previstas", title: "Saldo a entrar", description: "Saldo ainda a receber por vencimento, incluindo recorrências ativas e reservas sem lançamento. Pagamentos parciais são descontados. Previsão não é recebimento garantido.", emptyMessage: "Nenhum valor a receber no período.", items: projectedItems(forecastRevenue.filter(item => item.outstandingCents > 0)) },
    { id: "forecast", tone: "positive", label: "Faturamento previsto", value: dashboardMoney(forecastTotal), caption: "Receitas lançadas e programadas", title: "Previsão de faturamento total", description: "Lançamentos, recorrências ativas e reservas com valor definido, pelo vencimento. Inclui valores já pagos e não estima novas vendas.", emptyMessage: "Nenhuma receita prevista no período.", items: forecastRevenue.map(item => ({ ...projectedItems([item])[0], value: dashboardMoney(item.amountCents) })) },
    { id: "delinquency", label: "Inadimplência", value: dashboardMoney(overdueTotal), secondary: dashboardRate(dashboardPercent(overdueTotal, overdueBase)), tone: overdueTotal > 0 ? "negative" : "neutral", caption: "Saldo vencido / receitas já vencidas", title: "Inadimplência no período", description: "Contas com vencimento no período anterior a hoje. Percentual sobre o valor das contas já vencidas, pagas ou em aberto; baixas parciais são descontadas.", emptyMessage: "Nenhuma conta vencida em aberto no período.", items: overdue.map(entry => ({ id: entry.id, title: entry.player?.name || entry.counterpartyName || "Cliente não identificado", subtitle: entry.description, value: dashboardMoney(getOutstandingCents(entry.amountCents, entry.settlements)), tone: "negative" as const, date: dashboardDateKey(entry.dueDate!) })) },
    { id: "ticket", tone: "positive", label: "Ticket médio por cliente", value: identifiedClients.length ? dashboardMoney(sum(identifiedClients, client => client.value) / identifiedClients.length) : "—", caption: `${identifiedClients.length} clientes com pagamento`, title: "Ticket médio por cliente", description: "Recebimentos vinculados ao cadastro de clientes divididos pelo número de clientes distintos que pagaram no período, independentemente da visão selecionada.", emptyMessage: "Nenhum cliente com pagamento identificado.", items: clients.map(client => ({ id: client.id, title: client.name, tone: "positive" as const, value: dashboardMoney(client.value) })) },
    { id: "product-profit", label: "Lucro em produtos", value: dashboardMoney(productProfit), secondary: dashboardRate(dashboardPercent(productProfit, productRevenue)), tone: productProfit > 0 ? "positive" : productProfit < 0 ? "negative" : "neutral", caption: "Margem bruta · custo cadastrado atual", title: "Lucro em produtos", description: "Vendas menos custo dos produtos (serviços excluídos). Margem sobre a receita de produtos. O custo utiliza o cadastro atual, pois as vendas não armazenam custo histórico; despesas gerais não são deduzidas.", emptyMessage: "Nenhuma venda de produtos no período.", items: productSales.map(item => ({ id: item.id, title: item.name, subtitle: `${item.quantity} un. · Vendas ${dashboardMoney(item.revenue)} · Custo ${dashboardMoney(item.cost)}`, tone: item.revenue - item.cost > 0 ? "positive" as const : item.revenue - item.cost < 0 ? "negative" as const : "neutral" as const, value: `${dashboardMoney(item.revenue - item.cost)} · ${dashboardRate(dashboardPercent(item.revenue - item.cost, item.revenue))}` })) },
    { id: "active-clients", label: "Clientes ativos", value: activeClients.size, caption: "Com reserva, aula ou pagamento", title: "Clientes ativos no período", description: "Clientes distintos com participação em reserva, presença em aula ou pagamento identificado no período.", emptyMessage: "Nenhuma atividade de clientes no período.", items: [...activeClients].map(([id, title]) => ({ id, title })) },
    { id: "reservations", label: "Reservas", value: reservations.length, caption: `${dashboardRate(dashboardPercent(cancelled.length, reservations.length + cancelled.length))} de cancelamento · ${cancelled.length} canceladas`, comparison: previous && data.previousReservations !== 0 ? { percent: comparison(reservations.length, data.previousReservations) } : undefined, title: "Reservas no período", description: "Reservas ativas na grade, sem aulas, bloqueios nem pagamentos expirados. Taxa de cancelamento: canceladas / (ativas + canceladas).", emptyMessage: "Nenhuma reserva no período.", items: [...bookingItems(reservations), ...bookingItems(cancelled).map(item => ({ ...item, subtitle: `Cancelada · ${item.subtitle}` }))] },
    { id: "fixed-reservations", label: "Reservas fixas", value: fixed.length, secondary: dashboardRate(dashboardPercent(fixed.length, reservations.length)), caption: "Participação nas reservas ativas", title: "Reservas fixas", description: "Reservas vinculadas a série fixa ou com tipo fixo. Aulas fixas ficam no seu próprio indicador. Percentual sobre as reservas ativas da grade.", emptyMessage: "Nenhuma reserva fixa no período.", items: bookingItems(fixed) },
    { id: "occupancy", label: "Ocupação das quadras", value: formatOccupancy(occupancy.occupiedMinutes, occupancy.availableMinutes), caption: "Tempo reservado / disponível", title: "Taxa de ocupação", description: "Minutos ocupados dentro das faixas de funcionamento divididos pelos minutos disponíveis nas regras das quadras. Sobreposições não duplicam o tempo. Bloqueios e reservas canceladas não contam como ocupação.", emptyMessage: "Nenhuma quadra disponível para calcular a ocupação.", items: occupancy.courtInsights.map(court => ({ id: court.courtId, title: court.courtName, subtitle: `${court.reservations} reservas · ${court.occupiedMinutes} min reservados / ${court.availableMinutes} min disponíveis`, value: formatOccupancy(court.occupiedMinutes, court.availableMinutes) })) },
    { id: "lessons", label: "Aulas", value: lessonRows.length, caption: "Grade + aulas avulsas", title: "Aulas no período", description: "Aulas ativas da grade e do cadastro de aulas avulsas, sem cancelamentos.", emptyMessage: "Nenhuma aula no período.", items: lessonRows },
    { id: "fixed-lessons", label: "Aulas fixas", value: fixedLessons.length, caption: "Aulas recorrentes na grade", title: "Aulas fixas", description: "Aulas vinculadas a série recorrente ou identificadas explicitamente como aula fixa na grade.", emptyMessage: "Nenhuma aula fixa no período.", items: bookingItems(fixedLessons) },
    { id: "uncharged", label: "Reservas sem cobrança", value: uncharged.length, secondary: dashboardRate(dashboardPercent(uncharged.length, reservations.length)), caption: "Participação nas reservas ativas", title: "Reservas sem cobrança", description: "Reservas ativas sem valor a cobrar de nenhum participante, incluindo cobranças anuladas e excluindo aulas. Percentual sobre as reservas ativas da grade.", emptyMessage: "Todas as reservas do período têm cobrança.", items: bookingItems(uncharged) },
    { id: "portal-users", label: "Novos usuários do portal", value: data.portalAccounts.length, caption: "Cadastros no período", title: "Novos usuários do Portal", description: "Acessos criados no período selecionado.", emptyMessage: "Nenhum novo usuário no período.", items: data.portalAccounts.map(account => ({ id: account.id, title: account.player.name, subtitle: account.phone, date: account.createdAt.toISOString() })) },
  ];
  const courtsForEntry = (row: typeof rows[number]) => row.scheduleParticipant?.occurrence.occurrenceCourts.map(relation => ({ id: relation.courtId, name: relation.court.name })) ?? [];
  const courtRevenue = grouped(rows.filter(row => row.type === "REVENUE").flatMap(row => { const courts = courtsForEntry(row); return courts.length ? allocateDashboardCourts(row.value, courts) : [{ id: "unassigned", name: "Sem quadra vinculada", value: row.value }]; }));
  const entryById = new Map(data.entries.map(entry => [entry.id, entry]));
  const virtualCourts = new Map<string, Array<{ id: string; name: string }>>(active.flatMap(occurrence => occurrence.participants.map(participant => [`booking:${participant.id}`, occurrence.occurrenceCourts.map(relation => ({ id: relation.courtId, name: relation.court.name }))] as const)));
  const forecastCourts = grouped(forecastRevenue.flatMap(item => {
    const entry = entryById.get(item.id);
    const courts = entry ? (entry.scheduleParticipant?.occurrence.occurrenceCourts.map(relation => ({ id: relation.courtId, name: relation.court.name })) || []) : (virtualCourts.get(item.id) || []);
    return courts.length ? allocateDashboardCourts(item.amountCents, courts) : [{ id: "unassigned", name: "Sem quadra vinculada", value: item.amountCents }];
  }));
  const categories = grouped(rows.filter(row => row.type === "REVENUE").map(row => ({ id: row.category || "unknown", name: row.category || "Sem categoria", value: row.value })));
  const methods = grouped(receipts.map(row => ({ id: row.paymentMethod || "unknown", name: row.paymentMethod || "Não informado", value: row.value })));
  const months: DashboardBreakdown[] = [];
  for (const cursor = new Date(from.getFullYear(), from.getMonth(), 1); cursor <= horizonEnd; cursor.setMonth(cursor.getMonth() + 1)) {
    const key = dashboardDateKey(cursor).slice(0, 7);
    months.push({ id: key, name: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(cursor), value: sum(amounts.filter(item => item.type === "REVENUE" && dashboardDateKey(item.date).startsWith(key)), item => item.amountCents) });
  }
  const cashDays = [];
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const key = dashboardDateKey(cursor), daily = rows.filter(row => dashboardDateKey(row.date) === key);
    cashDays.push({ label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(cursor), income: sum(daily.filter(row => row.type === "REVENUE"), row => row.value), expense: sum(daily.filter(row => row.type === "EXPENSE"), row => row.value) });
  }
  return { cards, cashDays, received, paid, courtRevenue, forecastCourts, categories, methods, months, lessonsByTeacher, clients: clients.slice(0, 10), debtors: debtors.slice(0, 10), courtReservations: grouped(occupancy.courtInsights.map(court => ({ id: court.courtId, name: court.courtName, value: court.reservations }))), products: grouped(productSales.map(item => ({ id: item.id, name: item.name, value: item.quantity }))) };
}
