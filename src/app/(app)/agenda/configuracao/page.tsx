import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createCourtAction, createCourtWeeklyRuleAction, deleteCourtWeeklyRuleAction } from "@/lib/actions/calendar";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AgendaConfiguracaoPageProps = { searchParams?: { court?: string } };

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function priceLabel(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }

export default async function AgendaConfiguracaoPage({ searchParams }: AgendaConfiguracaoPageProps) {
  const auth = await requireModuleView("calendar");
  const courts = await prisma.court.findMany({
    where: { arenaId: auth.arenaId },
    include: { weeklyRules: { orderBy: [{ weekday: "asc" }, { startsAtMinute: "asc" }] } },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });
  const selectedCourt = searchParams?.court ? courts.find((court) => court.id === searchParams.court) : undefined;

  return <div className="agenda-config-page">
    <section className="agenda-config-toolbar" aria-label="Quadras e cadastro">
      <nav className="agenda-court-tabs" aria-label="Quadras cadastradas">
        {courts.map((court) => <Link key={court.id} href={`/agenda/configuracao/${court.id}`} className={court.id === selectedCourt?.id ? "agenda-court-tab agenda-court-tab-active" : "agenda-court-tab"}>{court.name}<span>{court.active ? "Ativa" : "Inativa"}</span></Link>)}
        {!courts.length ? <span className="agenda-court-tabs-empty">Nenhuma quadra cadastrada.</span> : null}
      </nav>
      <SafeActionForm action={createCourtAction} className="agenda-create-court-inline" resetOnSuccess successMessage="Quadra cadastrada.">
        <label className="sr-only" htmlFor="court-name">Nova quadra</label>
        <input id="court-name" name="name" type="text" placeholder="Nova quadra" required />
        <SubmitButton label="Adicionar" pendingLabel="Salvando..." className="button button-primary" />
      </SafeActionForm>
    </section>

    {selectedCourt ? <section className="agenda-court-workspace" aria-label={`Configuração da quadra ${selectedCourt.name}`}>
      <div className="agenda-court-workspace-bar"><strong>{selectedCourt.name}</strong><span>Crie faixas de preço e disponibilidade para cada dia.</span></div>
      <SafeActionForm action={createCourtWeeklyRuleAction} className="weekly-rule-form" resetOnSuccess successMessage="Faixa cadastrada.">
        <input name="courtId" type="hidden" value={selectedCourt.id} />
        <div className="field"><label htmlFor="weekly-rule-weekday">Dia da semana</label><select id="weekly-rule-weekday" name="weekday" defaultValue="1">{weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div>
        <div className="field"><label htmlFor="weekly-rule-start">Início</label><input id="weekly-rule-start" name="startTime" type="time" defaultValue="07:00" required /></div>
        <div className="field"><label htmlFor="weekly-rule-end">Fim</label><input id="weekly-rule-end" name="endTime" type="time" defaultValue="08:00" required /></div>
        <div className="field"><label htmlFor="weekly-rule-price">Valor do horário</label><input id="weekly-rule-price" name="price" inputMode="decimal" defaultValue="0,00" required /></div>
        <label className="checkbox-field"><input name="available" type="checkbox" defaultChecked />Disponível para reserva</label>
        <SubmitButton label="Adicionar faixa" pendingLabel="Salvando..." className="button button-primary" />
      </SafeActionForm>
      <div className="weekly-rule-list">{weekDays.map((day, weekday) => {
        const rules = selectedCourt.weeklyRules.filter((rule) => rule.weekday === weekday);
        return <section key={day} className="weekly-rule-day"><h3>{day}</h3>{rules.length ? <ul>{rules.map((rule) => <li key={rule.id}><span>{minuteLabel(rule.startsAtMinute)}–{minuteLabel(rule.endsAtMinute)}</span><strong>{priceLabel(rule.priceCents)}</strong><span className={rule.available ? "status-badge status-active" : "status-badge"}>{rule.available ? "Disponível" : "Indisponível"}</span><SafeActionForm action={deleteCourtWeeklyRuleAction} successMessage="Faixa removida."><input type="hidden" name="ruleId" value={rule.id} /><SubmitButton label="Remover" pendingLabel="Removendo..." className="button button-danger button-small" /></SafeActionForm></li>)}</ul> : <p className="muted">Sem faixa cadastrada.</p>}</section>;
      })}</div>
    </section> : <section className="agenda-court-empty">Selecione uma quadra para configurar seus períodos.</section>}
  </div>;
}
