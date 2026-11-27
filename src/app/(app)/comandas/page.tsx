import { getComandaList } from "@/lib/comandas/query";
import { parseAgendaDay } from "@/lib/backend/contracts/agenda-day";

import { canPerformPermission } from "@/lib/permissions";
import { CloseRequestsWatcher } from "@/components/comandas/close-requests-watcher";
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

type ComandasPageProps = {
  searchParams?: Promise<{ page?: string; pageSize?: string; date?: string; search?: string; ids?: string; new?: "client" | "avulsa"; player?: string }>;
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

export default async function ComandasPage(props: ComandasPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("pos");
  const canDeleteComandas = auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.arenaRole === "OWNER" || auth.arenaRole === "ADMIN";
  const data = await getComandaList(auth.arenaId, { ...(searchParams?.date ? {date:searchParams.date}:{}), ...(searchParams?.search ? {search:searchParams.search}:{}), ...(searchParams?.ids ? {ids:searchParams.ids}:{}) });
  const {operational,openRequests,openComandas,players,products,paymentMethods,bankAccounts}=data;
  const comandas=data.comandas.map(row=>({...row,closeRequestedAt:row.closeRequestedAt?new Date(row.closeRequestedAt):null}));
  const debtsByPlayer=Object.fromEntries(Object.entries(data.debtsByPlayer).map(([id,rows])=>[id,rows.map(row=>({...row,dueDate:row.dueDate?new Date(row.dueDate):null}))]));
  const selectedDate=parseAgendaDay(data.date)!;const today=parseAgendaDay(data.today)!;const openDays=data.openDays;
  const requestedIds=[...new Set((searchParams?.ids??"").split(",").map(id=>id.trim()).filter(Boolean))];
  const search=searchParams?.search?.trim()??"";const canOpenToday=data.date===data.today;
  const baseParams=new URLSearchParams({date:data.date});if(requestedIds.length)baseParams.set("ids",requestedIds.join(","));if(search)baseParams.set("search",search);

  return <div className={viewStyles.commands_page}><VisiblePageRefresh /><h1 className="tw:sr-only">Comandas</h1>
    {openRequests.length ? <section aria-label="Solicitações de abertura de comanda" className="tw:grid tw:gap-3 tw:rounded-md tw:border tw:border-amber-400 tw:border-l-4 tw:bg-amber-50 tw:p-4 tw:text-sm tw:text-amber-950"><strong>{openRequests.length} {openRequests.length === 1 ? "solicitação" : "solicitações"} de abertura de comanda</strong>{openRequests.map(request => <div data-notification-item={new URL(request.href, "https://arena.local").searchParams.get("player") ?? request.id} key={request.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><span>{request.message}</span><Link href={request.href} className={viewStyles.button}>Abrir comanda solicitada</Link></div>)}</section> : null}
    <header className={viewStyles.commands_toolbar}>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><CommandsDatePicker selectedDate={toDateInput(selectedDate)} search={search} openDays={[...openDays]} today={toDateInput(today)} />{requestedIds.length ? <Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate) })}`} className="tw:text-xs tw:text-[var(--brand)]">Ver todas do dia</Link> : null}</div>
      <div className={viewStyles.commands_toolbar_right}><form method="get" className={viewStyles.commands_search}><input type="hidden" name="date" value={toDateInput(selectedDate)} />{requestedIds.length ? <input type="hidden" name="ids" value={requestedIds.join(",")} /> : null}<span aria-hidden="true"><CommandIcon name="search" /></span><input name="search" defaultValue={search} placeholder="Buscar comanda" aria-label="Buscar comanda pelo nome" /><button className={viewStyles.button} type="submit">Buscar</button></form><div className={viewStyles.commands_actions}><Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate), new: "avulsa" })}`} className={viewStyles.button}><CommandIcon name="receipt" /> Nova Comanda Avulsa</Link></div></div>
    </header>

    {searchParams?.new && !canOpenToday ? <p role="alert" className="tw:text-sm tw:text-[#9a3412]">Comandas só podem ser abertas no dia vigente. Selecione hoje para abrir uma comanda.</p> : null}
    {canOpenToday && searchParams?.new === "client" ? <NewCommandModal canCreateClient={!searchParams?.player && canPerformPermission("players:create",auth.arenaRole,auth.systemRole,auth.editPermissions)} cardsEnabled={operational?.comandaCardsEnabled ?? false} players={searchParams?.player ? players.filter(player => player.id === searchParams.player) : players} closeHref={`/comandas?${baseParams}`} action={createComandaAction} /> : null}
    {canOpenToday && searchParams?.new === "avulsa" ? <section className={viewStyles.commands_create_panel}><SafeActionForm action={createComandaAction} className={viewStyles.commands_create_form} successMessage="Comanda avulsa aberta."><input type="hidden" name="type" value="AVULSA" /><input type="hidden" name="date" value={toDateInput(today)} />{operational?.comandaCardsEnabled ? <label className={viewStyles.field}>Número do cartão de comanda<input name="cardNumber" maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="Opcional · digite ou leia o cartão" /></label> : null}<label className={viewStyles.field}>Nome da comanda<input name="label" placeholder="Ex.: Mesa 4" required /></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className={`${viewStyles.button_button_primary} tw:bg-[#087443]! tw:[background-image:none]! tw:border-[#087443]! tw:text-white!`} /><Link href={`/comandas?${baseParams}`} className={viewStyles.button}>Cancelar</Link></SafeActionForm></section> : null}

    <CloseRequestsWatcher revision={data.closeRequestRevision} />
    <section className={viewStyles.commands_list_commands_day_panel}><div className={viewStyles.commands_list_head}>{comandas.length ? <Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate), new: "client" })}`} className={viewStyles.button_button_primary}><CommandIcon name="plus" /> Nova comanda</Link> : null}<span><i aria-hidden="true"><CommandIcon name="list" /></i> {comandas.length} comanda{comandas.length === 1 ? "" : "s"}</span></div>{comandas.length ? <div className={viewStyles.commands_list_items}>{comandas.map((comanda) => <CommandCard bankAccounts={bankAccounts} requireFullPayment={operational?.requireFullPayment ?? false} preventOverpayment={operational?.preventOverpayment ?? true} key={comanda.id} canDelete={canDeleteComandas} people={players.map(player => ({ ...player, openComanda: openComandas.find(command => command.playerId === player.id)?.code }))} products={products.map(product => product.isService ? { ...product, category: { name: "Serviços" } } : product)} paymentMethods={paymentMethods} debts={comanda.playerId ? (debtsByPlayer[comanda.playerId] ?? []).filter(debt => !comanda.bookingServices.some(service => service.financialEntryId === debt.id)) : []} clientCreditCents={comanda.clientCreditCents} comanda={comanda} />)}</div> : <div className={viewStyles.commands_empty}><div className={viewStyles.commands_empty_illustration} aria-hidden="true"><CommandIcon name="receipt" /></div><strong>Nenhuma comanda neste dia.</strong><span>Crie uma nova comanda para iniciar o atendimento.</span><Link href={`/comandas?${new URLSearchParams({ date: toDateInput(selectedDate), new: "client" })}`} className={viewStyles.button_button_primary_commands_empty_action}><CommandIcon name="plus" /> Nova Comanda</Link></div>}</section>
  </div>;
}
