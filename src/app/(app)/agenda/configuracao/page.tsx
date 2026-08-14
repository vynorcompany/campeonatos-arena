import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createCourtAction, updateScheduleSettingsAction } from "@/lib/actions/calendar";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function timeValue(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export default async function AgendaConfiguracaoPage() {
  const auth = await requireModuleView("calendar");
  const [arena, courts] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true } }),
    prisma.court.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ active: "desc" }, { name: "asc" }] })
  ]);
  return <div className="stack-md">
    <header className="page-header agenda-header"><div className="stack-xs"><p className="eyebrow">Operação</p><h1>Configuração da agenda</h1><p className="muted">Defina a operação da grade e as quadras, sem misturar esses controles à agenda diária.</p></div><Link href="/agenda" className="button">Ver agenda</Link></header>
    <div className="agenda-settings-layout">
      <SectionCard title="Horários da grade" description="Os intervalos definem as linhas disponíveis na agenda de quadras."><SafeActionForm action={updateScheduleSettingsAction} className="agenda-settings-form" successMessage="Grade atualizada."><div className="field"><label htmlFor="schedule-start-time">Horário de abertura</label><input id="schedule-start-time" name="startTime" type="time" defaultValue={timeValue(arena.scheduleStartMinute)} required /></div><div className="field"><label htmlFor="schedule-end-time">Horário de encerramento</label><input id="schedule-end-time" name="endTime" type="time" defaultValue={timeValue(arena.scheduleEndMinute)} required /></div><div className="field"><label htmlFor="schedule-slot-minutes">Intervalo da grade</label><select id="schedule-slot-minutes" name="slotMinutes" defaultValue={arena.scheduleSlotMinutes}>{[15, 30, 45, 60].map((value) => <option key={value} value={value}>{value} minutos</option>)}</select></div><SubmitButton label="Salvar horários" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm></SectionCard>
      <SectionCard title="Quadras cadastradas" description="Cadastre quantas quadras sua arena possuir. Elas serão as colunas da agenda diária."><SafeActionForm action={createCourtAction} className="agenda-court-form" resetOnSuccess successMessage="Quadra cadastrada."><div className="field"><label htmlFor="court-name">Nova quadra</label><input id="court-name" name="name" type="text" placeholder="Ex.: Quadra 1" required /></div><SubmitButton label="Adicionar quadra" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm>{courts.length ? <ul className="agenda-court-list">{courts.map((court) => <li key={court.id}><span>{court.name}</span><span className={court.active ? "status-badge status-active" : "status-badge"}>{court.active ? "Ativa" : "Inativa"}</span></li>)}</ul> : <p className="muted">Nenhuma quadra cadastrada.</p>}</SectionCard>
    </div>
  </div>;
}
