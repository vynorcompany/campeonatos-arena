import Link from "next/link";
import { CommandsDatePicker } from "@/components/comandas/commands-date-picker";
import { CommandCard } from "@/components/comandas/command-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createComandaAction } from "@/lib/actions/comanda";
import { requireModuleView } from "@/lib/auth/guards";
import { getOutstandingCents } from "@/lib/finance/settlements";
import { prisma } from "@/lib/prisma";

type ComandasPageProps = {
  searchParams?: { date?: string; search?: string; new?: "client" | "avulsa" };
};

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date();
}

function startOfDay(value: Date) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(value);
}

export default async function ComandasPage({ searchParams }: ComandasPageProps) {
  const auth = await requireModuleView("pos");
  const canDeleteComandas = auth.systemRole === "SUPER_ADMIN" || auth.systemRole === "ADMIN" || auth.arenaRole === "OWNER" || auth.arenaRole === "ADMIN";
  const selectedDate = startOfDay(parseDate(searchParams?.date));
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const search = searchParams?.search?.trim() ?? "";
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 42);

  const [comandas, openComandas, players, products, paymentMethodSettings, pendingDebts] = await Promise.all([
    prisma.comanda.findMany({
      where: {
        arenaId: auth.arenaId,
        status: "OPEN",
        openedAt: { gte: selectedDate, lt: nextDate },
        ...(search ? { label: { contains: search, mode: "insensitive" } } : {})
      },
      orderBy: { openedAt: "desc" },
      include: { player: { select: { name: true } }, items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } } }
    }),
    prisma.comanda.findMany({
      where: { arenaId: auth.arenaId, status: "OPEN", openedAt: { gte: calendarStart, lt: calendarEnd } },
      select: { openedAt: true }
    }),
    searchParams?.new === "client"
      ? prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    prisma.product.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, priceCents: true, stockQuantity: true, category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.paymentMethodSetting.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.financialEntry.findMany({
      where: { arenaId: auth.arenaId, status: "PENDING" },
      select: {
        id: true, description: true, amountCents: true, dueDate: true,
        settlements: { select: { amountCents: true } },
        scheduleParticipant: { select: { playerId: true } },
        sale: { select: { comanda: { select: { playerId: true } } } }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
    })
  ]);

  const openDays = new Set(openComandas.map((comanda) => toDateInput(comanda.openedAt)));
  const today = startOfDay(new Date());
  const baseParams = new URLSearchParams({ date: toDateInput(selectedDate) });
  if (search) baseParams.set("search", search);
  const paymentMethods = paymentMethodSettings.length ? paymentMethodSettings.map((method) => method.name) : ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Saldo de crédito"];
  const debtsByPlayer = pendingDebts.reduce<Record<string, { id: string; description: string; amountCents: number; dueDate: Date | null }[]>>((current, debt) => {
    const playerId = debt.scheduleParticipant?.playerId ?? debt.sale?.comanda?.playerId;
    const outstandingCents = getOutstandingCents(debt.amountCents, debt.settlements);
    if (playerId && outstandingCents > 0) (current[playerId] ??= []).push({ id: debt.id, description: debt.description, amountCents: outstandingCents, dueDate: debt.dueDate });
    return current;
  }, {});

  return <div className="commands-page">
    <header className="commands-toolbar">
      <CommandsDatePicker selectedDate={toDateInput(selectedDate)} search={search} openDays={[...openDays]} today={toDateInput(today)} />
      <div className="commands-toolbar-right"><form method="get" className="commands-search"><input type="hidden" name="date" value={toDateInput(selectedDate)} /><span aria-hidden="true">⌕</span><input name="search" defaultValue={search} placeholder="Buscar comanda" aria-label="Buscar comanda pelo nome" /><button className="button" type="submit">Buscar</button></form><div className="commands-actions"><Link href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), new: "client" })}`} className="button button-primary"><span aria-hidden="true">＋</span> Nova Comanda</Link><Link href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), new: "avulsa" })}`} className="button"><span aria-hidden="true">▤</span> Nova Comanda Avulsa</Link></div></div>
    </header>

    {searchParams?.new === "client" ? <section className="commands-create-panel"><SafeActionForm action={createComandaAction} className="commands-create-form" successMessage="Comanda aberta."><input type="hidden" name="type" value="CLIENT" /><label className="field">Cliente<select name="playerId" defaultValue="" required><option value="">Selecione um cliente</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className="button button-primary" /><Link href={`/comandas?${baseParams}`} className="button">Cancelar</Link></SafeActionForm></section> : null}
    {searchParams?.new === "avulsa" ? <section className="commands-create-panel"><SafeActionForm action={createComandaAction} className="commands-create-form" successMessage="Comanda avulsa aberta."><input type="hidden" name="type" value="AVULSA" /><label className="field">Nome da comanda<input name="label" placeholder="Ex.: Mesa 4" required /></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className="button button-primary" /><Link href={`/comandas?${baseParams}`} className="button">Cancelar</Link></SafeActionForm></section> : null}

    <section className="commands-list commands-day-panel"><div className="commands-list-head"><div><span className="commands-day-heading-icon" aria-hidden="true">▣</span><strong>{formatDate(selectedDate)}</strong></div><span><i aria-hidden="true">☷</i> {comandas.length} comanda{comandas.length === 1 ? "" : "s"}</span></div>{comandas.length ? <div className="commands-list-items">{comandas.map((comanda) => <CommandCard key={comanda.id} canDelete={canDeleteComandas} products={products} paymentMethods={paymentMethods} debts={comanda.playerId ? debtsByPlayer[comanda.playerId] ?? [] : []} comanda={{ id: comanda.id, code: comanda.code, label: comanda.label, type: comanda.type, playerName: comanda.player?.name, items: comanda.items }} />)}</div> : <div className="commands-empty"><div className="commands-empty-illustration" aria-hidden="true">▤</div><strong>Nenhuma comanda neste dia.</strong><span>Crie uma nova comanda para iniciar o atendimento.</span><Link href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), new: "client" })}`} className="button button-primary commands-empty-action"><span aria-hidden="true">＋</span> Nova Comanda</Link></div>}</section>
  </div>;
}
