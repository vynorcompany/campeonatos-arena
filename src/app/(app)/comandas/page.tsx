import { decorateCompositions } from "@/lib/products/composition";
import { CloseRequestsWatcher } from "@/components/comandas/close-requests-watcher";
import { bookingServicesInclude, bookingServiceRows } from "@/lib/comandas/booking-service";
import { viewStyles } from "./page.utilities";
import { VisiblePageRefresh } from "@/components/performance/visible-page-refresh";
import Link from "next/link";
import { CommandsDatePicker } from "@/components/comandas/commands-date-picker";
import { CommandCard } from "@/components/comandas/command-card";
import { NewCommandModal } from "@/components/comandas/new-command-modal";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createComandaAction } from "@/lib/actions/comanda";
import { requireModuleView } from "@/lib/auth/guards";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { comandaDebtOwnerId } from "@/lib/finance/comanda-debts";
import { arenaToday, arenaWallClockToInstant, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { withArenaTransaction } from "@/lib/rls";

type ComandasPageProps = {
  searchParams?: Promise<{ date?: string; search?: string; ids?: string; new?: "client" | "avulsa"; player?: string }>;
};

function CommandIcon({ name }: { name: "search" | "receipt" | "calendar" | "list" | "plus" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="5.5" /><path d="m15.2 15.2 4 4" /></>,
    receipt: <><path d="M7 3.5h10v17L15 19l-2 1.5L11 19l-2 1.5L7 19V3.5Z" /><path d="M10 8h4M10 12h4M10 16h3" /></>,
    calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
    list: <><path d="M9 7h9M9 12h9M9 17h9" /><circle cx="6" cy="7" r=".7" /><circle cx="6" cy="12" r=".7" /><circle cx="6" cy="17" r=".7" /></>,
    plus: <path d="M12 6v12M6 12h12" />
  };
  return <svg className={viewStyles.commands_icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(value);
}

export default async function ComandasPage(props: ComandasPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("pos");
  const canDeleteComandas = auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.arenaRole === "OWNER" || auth.arenaRole === "ADMIN";
  const requestedIds = [...new Set((searchParams?.ids ?? "").split(",").map(id => id.trim()).filter(Boolean))];
  const selectedDate = startOfDay(parseDate(searchParams?.date));
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const search = searchParams?.search?.trim() ?? "";
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 42);

  const [comandas, openComandas, players, products, paymentMethodSettings, pendingDebts, bankAccounts] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.comanda.findMany({
      where: {
        arenaId: auth.arenaId,
        status: "OPEN",
        ...(requestedIds.length ? { id: { in: requestedIds } } : { OR: [{ openedAt: { gte: arenaWallClockToInstant(selectedDate), lt: arenaWallClockToInstant(nextDate) } }, { closeRequestedAt: { not: null } }] }),
        ...(search ? { label: { contains: search, mode: "insensitive" } } : {})
      },
      orderBy: [{ closeRequestedAt: { sort: "asc", nulls: "last" } }, { openedAt: "desc" }],
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
      where: { arenaId: auth.arenaId, type: { in: ["REVENUE", "INCOME"] }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
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

  const operational = await withArenaTransaction(auth.arenaId, tx => tx.arenaOperationalSettings.findUnique({ where: { arenaId: auth.arenaId }, select: { comandaCardsEnabled: true, requireFullPayment: true, preventOverpayment: true } }));
  const openRequests = await withArenaTransaction(auth.arenaId, tx => tx.arenaNotification.findMany({ where: { arenaId: auth.arenaId, type: "COMANDA_OPEN_REQUEST", readAt: null }, orderBy: { createdAt: "asc" }, take: 30, select: { id: true, message: true, href: true } }));
  const closeRequestStats = await withArenaTransaction(auth.arenaId, tx => tx.comanda.aggregate({ where: { arenaId: auth.arenaId, status: "OPEN", closeRequestedAt: { not: null } }, _count: { id: true }, _max: { closeRequestedAt: true } }));
  const openDays = new Set(openComandas.map((comanda) => toDateInput(instantToArenaWallClock(comanda.openedAt))));
  const today = arenaToday();
  const baseParams = new URLSearchParams({ date: toDateInput(selectedDate) });
  if (requestedIds.length) baseParams.set("ids", requestedIds.join(","));
  if (search) baseParams.set("search", search);
  const paymentMethods = paymentMethodSettings.length ? paymentMethodSettings.map((method) => method.name).filter(name => !/^(saldo\b|credito (do cliente|em conta)\b)/.test(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase())) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito"];
  const debtsByPlayer = pendingDebts.reduce<Record<string, { id: string; description: string; amountCents: number; dueDate: Date | null }[]>>((current, debt) => {
    const playerId = comandaDebtOwnerId(debt);
    const outstandingCents = getOutstandingCents(debt.amountCents, debt.settlements);
    if (playerId && outstandingCents > 0) (current[playerId] ??= []).push({ id: debt.id, description: debt.description, amountCents: outstandingCents, dueDate: debt.dueDate });
    return current;
  }, {});

  return <div className={viewStyles.commands_page}><VisiblePageRefresh /><h1 className="tw:sr-only">Comandas</h1>
    {openRequests.length ? <section aria-label="Solicitações de abertura de comanda" className="tw:grid tw:gap-3 tw:rounded-md tw:border tw:border-amber-400 tw:border-l-4 tw:bg-amber-50 tw:p-4 tw:text-sm tw:text-amber-950"><strong>{openRequests.length} {openRequests.length === 1 ? "solicitação" : "solicitações"} de abertura de comanda</strong>{openRequests.map(request => <div key={request.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><span>{request.message}</span><Link href={request.href} className={viewStyles.button}>Abrir comanda solicitada</Link></div>)}</section> : null}
    <header className={viewStyles.commands_toolbar}>
      {requestedIds.length ? <div className="tw:grid tw:gap-1"><strong className="tw:text-sm">Comandas selecionadas</strong><Link href="/comandas" className="tw:text-xs tw:text-[var(--brand)]">Ver comandas do dia</Link></div> : <CommandsDatePicker selectedDate={toDateInput(selectedDate)} search={search} openDays={[...openDays]} today={toDateInput(today)} />}
      <div className={viewStyles.commands_toolbar_right}><form method="get" className={viewStyles.commands_search}><input type="hidden" name="date" value={toDateInput(selectedDate)} />{requestedIds.length ? <input type="hidden" name="ids" value={requestedIds.join(",")} /> : null}<span aria-hidden="true"><CommandIcon name="search" /></span><input name="search" defaultValue={search} placeholder="Buscar comanda" aria-label="Buscar comanda pelo nome" /><button className={viewStyles.button} type="submit">Buscar</button></form><div className={viewStyles.commands_actions}><Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate), new: "avulsa" })}`} className={viewStyles.button}><CommandIcon name="receipt" /> Nova Comanda Avulsa</Link></div></div>
    </header>

    {searchParams?.new === "client" ? <NewCommandModal cardsEnabled={operational?.comandaCardsEnabled ?? false} players={searchParams?.player ? players.filter(player => player.id === searchParams.player) : players} closeHref={`/comandas?${baseParams}`} action={createComandaAction} /> : null}
    {searchParams?.new === "avulsa" ? <section className={viewStyles.commands_create_panel}><SafeActionForm action={createComandaAction} className={viewStyles.commands_create_form} successMessage="Comanda avulsa aberta."><input type="hidden" name="type" value="AVULSA" />{operational?.comandaCardsEnabled ? <label className={viewStyles.field}>Número do cartão de comanda<input name="cardNumber" maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="Opcional · digite ou leia o cartão" /></label> : null}<label className={viewStyles.field}>Nome da comanda<input name="label" placeholder="Ex.: Mesa 4" required /></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className={`${viewStyles.button_button_primary} tw:bg-[#087443]! tw:[background-image:none]! tw:border-[#087443]! tw:text-white!`} /><Link href={`/comandas?${baseParams}`} className={viewStyles.button}>Cancelar</Link></SafeActionForm></section> : null}

    <CloseRequestsWatcher revision={`${closeRequestStats._count.id}:${closeRequestStats._max.closeRequestedAt?.toISOString() ?? ""}`} />
    <section className={viewStyles.commands_list_commands_day_panel}><div className={viewStyles.commands_list_head}><span><i aria-hidden="true"><CommandIcon name="list" /></i> {comandas.length} comanda{comandas.length === 1 ? "" : "s"}</span></div>{comandas.length ? <div className={viewStyles.commands_list_items}>{comandas.map((comanda) => <CommandCard bankAccounts={bankAccounts} requireFullPayment={operational?.requireFullPayment ?? false} preventOverpayment={operational?.preventOverpayment ?? true} key={comanda.id} canDelete={canDeleteComandas} people={players.map(player => ({ ...player, openComanda: openComandas.find(command => command.playerId === player.id)?.code }))} products={products.map(product => product.isService ? { ...product, category: { name: "Serviços" } } : product)} paymentMethods={paymentMethods} debts={comanda.playerId ? (debtsByPlayer[comanda.playerId] ?? []).filter(debt => !comanda.bookingServices.some(service => service.participant.financialEntryId === debt.id)) : []} clientCreditCents={Math.max(0, comanda.player?.balanceMovements.reduce((total, movement) => total + movement.amountCents, 0) ?? 0)} comanda={{ id: comanda.id, playerId: comanda.playerId, code: comanda.code, cardNumber: comanda.cardNumber, closeRequestedAt: comanda.closeRequestedAt, label: comanda.label, type: comanda.type, openedByUserName: comanda.openedByUserName, bookingServices: bookingServiceRows(comanda.bookingServices), playerName: comanda.player?.name, items: comanda.items, requests: comanda.requests.map((request) => ({ id: request.id, quantity: request.quantity, productName: request.product.name + (request.compositionLabel ? ` · ${request.compositionLabel}` : "") })) }} />)}</div> : <div className={viewStyles.commands_empty}><div className={viewStyles.commands_empty_illustration} aria-hidden="true"><CommandIcon name="receipt" /></div><strong>Nenhuma comanda neste dia.</strong><span>Crie uma nova comanda para iniciar o atendimento.</span><Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate), new: "client" })}`} className={viewStyles.button_button_primary_commands_empty_action}><CommandIcon name="plus" /> Nova Comanda</Link></div>}</section>
  </div>;
}
