import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createComandaAction } from "@/lib/actions/comanda";
import { requireModuleView } from "@/lib/auth/guards";
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
  const selectedDate = startOfDay(parseDate(searchParams?.date));
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const search = searchParams?.search?.trim() ?? "";
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 42);

  const [comandas, openComandas, players] = await Promise.all([
    prisma.comanda.findMany({
      where: {
        arenaId: auth.arenaId,
        openedAt: { gte: selectedDate, lt: nextDate },
        ...(search ? { label: { contains: search, mode: "insensitive" } } : {})
      },
      orderBy: { openedAt: "desc" },
      include: { player: { select: { name: true } } }
    }),
    prisma.comanda.findMany({
      where: { arenaId: auth.arenaId, status: "OPEN", openedAt: { gte: calendarStart, lt: calendarEnd } },
      select: { openedAt: true }
    }),
    searchParams?.new === "client"
      ? prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([])
  ]);

  const openDays = new Set(openComandas.map((comanda) => toDateInput(comanda.openedAt)));
  const today = startOfDay(new Date());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
  const baseParams = new URLSearchParams({ date: toDateInput(selectedDate) });
  if (search) baseParams.set("search", search);

  return <div className="commands-page">
    <header className="commands-toolbar">
      <form method="get" className="commands-date-filter"><label htmlFor="commands-date">Comandas do dia</label><input id="commands-date" name="date" type="date" defaultValue={toDateInput(selectedDate)} /><input type="hidden" name="search" value={search} /><button className="button" type="submit">Ver dia</button></form>
      <form method="get" className="commands-search"><input type="hidden" name="date" value={toDateInput(selectedDate)} /><input name="search" defaultValue={search} placeholder="Buscar comanda" aria-label="Buscar comanda pelo nome" /><button className="button" type="submit">Buscar</button></form>
      <div className="commands-actions"><Link href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), new: "client" })}`} className="button button-primary">Nova Comanda</Link><Link href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), new: "avulsa" })}`} className="button">Nova Comanda Avulsa</Link></div>
    </header>

    <section className="commands-calendar" aria-label="Calendário de comandas"><div className="commands-calendar-head"><strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selectedDate)}</strong><span>O marcador vermelho indica comanda aberta em dia anterior.</span></div><div className="commands-calendar-grid">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}{calendarDays.map((day) => { const key = toDateInput(day); const isSelected = key === toDateInput(selectedDate); const hasOpen = day < today && openDays.has(key); return <Link key={key} href={`/comandas?${new URLSearchParams({ ...Object.fromEntries(baseParams), date: key })}`} className={`commands-calendar-day${isSelected ? " commands-calendar-day-active" : ""}${day.getMonth() !== selectedDate.getMonth() ? " commands-calendar-day-muted" : ""}`}>{day.getDate()}{hasOpen ? <i className="calendar-open-indicator" aria-label="Há comandas abertas" /> : null}</Link>; })}</div></section>

    {searchParams?.new === "client" ? <section className="commands-create-panel"><SafeActionForm action={createComandaAction} className="commands-create-form" successMessage="Comanda aberta."><input type="hidden" name="type" value="CLIENT" /><label className="field">Cliente<select name="playerId" defaultValue="" required><option value="">Selecione um cliente</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className="button button-primary" /><Link href={`/comandas?${baseParams}`} className="button">Cancelar</Link></SafeActionForm></section> : null}
    {searchParams?.new === "avulsa" ? <section className="commands-create-panel"><SafeActionForm action={createComandaAction} className="commands-create-form" successMessage="Comanda avulsa aberta."><input type="hidden" name="type" value="AVULSA" /><label className="field">Nome da comanda<input name="label" placeholder="Ex.: Mesa 4" required /></label><SubmitButton label="Abrir comanda" pendingLabel="Abrindo..." className="button button-primary" /><Link href={`/comandas?${baseParams}`} className="button">Cancelar</Link></SafeActionForm></section> : null}

    <section className="commands-list"><div className="commands-list-head"><strong>{formatDate(selectedDate)}</strong><span>{comandas.length} comanda{comandas.length === 1 ? "" : "s"}</span></div>{comandas.length ? <div className="commands-list-items">{comandas.map((comanda) => <article key={comanda.id} className="command-card"><div><strong>{comanda.label}</strong><span>{comanda.type === "AVULSA" ? "Avulsa" : comanda.player?.name ?? "Cliente"}</span></div><div><span className="status-badge status-active">Aberta</span><small>{comanda.code}</small></div></article>)}</div> : <div className="commands-empty"><strong>Nenhuma comanda neste dia.</strong><span>Crie uma nova comanda para iniciar o atendimento.</span></div>}</section>
  </div>;
}
