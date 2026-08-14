import Link from "next/link";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type AgendaPageProps = { searchParams?: { data?: string } };

function parseDate(value?: string) { if (!value) return new Date(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dateInputValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function minuteOfDay(value: Date) { return value.getHours() * 60 + value.getMinutes(); }
function priceLabel(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const auth = await requireModuleView("calendar");
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = addDays(selectedDate, 1);
  const [arena, courts, scheduleOccurrences] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true } }),
    prisma.court.findMany({ where: { arenaId: auth.arenaId, active: true }, include: { weeklyRules: true }, orderBy: { name: "asc" } }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true }, orderBy: { startsAt: "asc" } })
  ]);
  const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / arena.scheduleSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * arena.scheduleSlotMinutes);
  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3));
  const weekday = selectedDate.getDay();
  const dayHref = (date: Date) => `/agenda?data=${dateInputValue(date)}`;
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(selectedDate);

  return <div className="agenda-page" aria-label="Agenda de quadras">
    <div className="agenda-date-strip">
      <Link href={dayHref(addDays(selectedDate, -1))} className="agenda-date-arrow" aria-label="Dia anterior">‹</Link>
      <div className="agenda-date-list">{days.map((date) => { const selected = date.getTime() === selectedDate.getTime(); return <Link key={dateInputValue(date)} href={dayHref(date)} className={selected ? "agenda-date-item agenda-date-item-active" : "agenda-date-item"}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "")}</span><strong>{date.getDate()}</strong></Link>; })}</div>
      <Link href={dayHref(addDays(selectedDate, 1))} className="agenda-date-arrow" aria-label="Próximo dia">›</Link>
      <Link href={dayHref(startOfDay(new Date()))} className="agenda-today-link">Hoje</Link>
      <Link href="/agenda/configuracao" className="agenda-settings-link">Configurar</Link>
    </div>
    <div className="agenda-grid-caption"><strong>{selectedDateLabel}</strong><span>Preço e disponibilidade por quadra</span></div>
    {courts.length ? <div className="daily-court-grid-scroll"><table className="daily-court-grid"><thead><tr><th scope="col">Hora</th>{courts.map((court) => <th scope="col" key={court.id}>{court.name}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot}><th scope="row">{minuteLabel(slot)}</th>{courts.map((court) => {
      const occurrence = scheduleOccurrences.find((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) === slot);
      const isOccupied = scheduleOccurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) < slot && minuteOfDay(item.endsAt) > slot);
      if (isOccupied) return null;
      if (occurrence) { const rows = Math.max(1, Math.ceil((minuteOfDay(occurrence.endsAt) - minuteOfDay(occurrence.startsAt)) / arena.scheduleSlotMinutes)); return <td className="daily-court-event" key={court.id} rowSpan={rows}><strong>{occurrence.title}</strong><span>{occurrence.sourceType}</span></td>; }
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.startsAtMinute <= slot && item.endsAtMinute > slot);
      if (!rule || !rule.available) return <td className="daily-court-unavailable" key={court.id}><span>Indisponível</span></td>;
      return <td className="daily-court-available" key={court.id}><strong>{priceLabel(rule.priceCents)}</strong><span>Livre</span></td>;
    })}</tr>)}</tbody></table></div> : <div className="agenda-empty"><h2>Cadastre suas quadras para abrir a agenda</h2><p>Crie as quadras e as faixas semanais para visualizar os horários disponíveis.</p><Link className="button button-primary" href="/agenda/configuracao">Configurar agenda</Link></div>}
  </div>;
}
