import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
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

  return <div className="stack-md">
    <header className="page-header agenda-header"><div className="stack-xs"><p className="eyebrow">Operação</p><h1>Configuração da agenda</h1><p className="muted">Cadastre as faixas recorrentes de cada quadra, de domingo a sábado.</p></div><Link href="/agenda" className="button">Ver agenda</Link></header>
    <div className="agenda-settings-layout">
      <SectionCard title="Selecionar quadra" description="Escolha uma quadra para configurar seus períodos.">
        {courts.length ? <ul className="agenda-court-list">{courts.map((court) => <li key={court.id}><Link href={`/agenda/configuracao/${court.id}`} className="agenda-court-link">{court.name}</Link><span className={court.active ? "status-badge status-active" : "status-badge"}>{court.active ? "Ativa" : "Inativa"}</span></li>)}</ul> : <p className="muted">Nenhuma quadra cadastrada.</p>}
      </SectionCard>
      <SectionCard title="Cadastrar nova quadra" description="Informe o nome da nova quadra para adicioná-la à agenda.">
        <SafeActionForm action={createCourtAction} className="agenda-court-form" resetOnSuccess successMessage="Quadra cadastrada."><div className="field"><label htmlFor="court-name">Nova quadra</label><input id="court-name" name="name" type="text" placeholder="Ex.: Quadra 1" required /></div><SubmitButton label="Adicionar quadra" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm>
      </SectionCard>
      {selectedCourt ? <SectionCard title={`Configuração da quadra: ${selectedCourt.name}`} description="Crie quantas faixas precisar para cada dia. Faixas que se sobrepõem são bloqueadas.">
        {selectedCourt ? <>
          <form className="agenda-court-selector"><label htmlFor="selected-court">Quadra selecionada</label><select id="selected-court" name="court" defaultValue={selectedCourt.id}>{courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select><button className="button" type="submit">Editar</button></form>
          <SafeActionForm action={createCourtWeeklyRuleAction} className="weekly-rule-form" resetOnSuccess successMessage="Faixa cadastrada.">
            <input name="courtId" type="hidden" value={selectedCourt.id} />
            <div className="field"><label htmlFor="weekly-rule-weekday">Dia da semana</label><select id="weekly-rule-weekday" name="weekday" defaultValue="1">{weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></div>
            <div className="field"><label htmlFor="weekly-rule-start">Início</label><input id="weekly-rule-start" name="startTime" type="time" defaultValue="07:00" required /></div>
            <div className="field"><label htmlFor="weekly-rule-end">Fim</label><input id="weekly-rule-end" name="endTime" type="time" defaultValue="08:00" required /></div>
            <div className="field"><label htmlFor="weekly-rule-price">Valor do horário</label><input id="weekly-rule-price" name="price" inputMode="decimal" defaultValue="0,00" required /></div>
            <label className="checkbox-field"><input name="available" type="checkbox" defaultChecked />Disponível para reserva</label>
            <SubmitButton label="Adicionar faixa" pendingLabel="Salvando..." className="button button-primary" />
          </SafeActionForm>
          <div className="weekly-rule-list">{weekDays.map((day, weekday) => { const rules = selectedCourt.weeklyRules.filter((rule) => rule.weekday === weekday); return <section key={day} className="weekly-rule-day"><h3>{day}</h3>{rules.length ? <ul>{rules.map((rule) => <li key={rule.id}><span>{minuteLabel(rule.startsAtMinute)}–{minuteLabel(rule.endsAtMinute)}</span><strong>{priceLabel(rule.priceCents)}</strong><span className={rule.available ? "status-badge status-active" : "status-badge"}>{rule.available ? "Disponível" : "Indisponível"}</span><SafeActionForm action={deleteCourtWeeklyRuleAction} successMessage="Faixa removida."><input type="hidden" name="ruleId" value={rule.id} /><SubmitButton label="Remover" pendingLabel="Removendo..." className="button button-danger button-small" /></SafeActionForm></li>)}</ul> : <p className="muted">Sem faixa cadastrada.</p>}</section>; })}</div>
        </> : <p className="muted">Cadastre uma quadra para definir suas faixas.</p>}
      </SectionCard> : null}
    </div>
  </div>;
}
