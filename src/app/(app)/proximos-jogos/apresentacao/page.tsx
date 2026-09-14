import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { upsertTvPresentationSettingsAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getTvPresentationPayload } from "@/lib/services/tv-presentation";

function checked(value: boolean) { return value ? { defaultChecked: true } : {}; }

export default async function TvPresentationSettingsPage() {
  const auth = await requireModuleView("tv");
  const [payload, tournaments, leagueCycles] = await Promise.all([
    getTvPresentationPayload(auth.arenaId),
    prisma.tournament.findMany({ where: { arenaId: auth.arenaId, status: { not: "FINISHED" } }, orderBy: [{ createdAt: "desc" }], select: { id: true, name: true, status: true } }),
    prisma.leagueCycle.findMany({ where: { status: "OPEN", competition: { category: { tournament: { arenaId: auth.arenaId } } } }, orderBy: [{ updatedAt: "desc" }], select: { id: true, prizeDescription: true, competition: { select: { category: { select: { name: true } } } } } })
  ]);

  return <div className="stack-md">
    <header className="page-header"><div className="stack-xs"><p className="eyebrow">Tela da TV</p><h1>Apresentação em slides</h1><p className="muted">Defina uma rotação objetiva de jogos, agenda e patrocinadores para o telão.</p></div><Link href="/proximos-jogos/tv" className="button button-primary" target="_blank" rel="noreferrer">Abrir TV</Link></header>
    <SectionCard title="Slides exibidos" description="As logos selecionadas aparecem no carrossel. Premiações são definidas nas ligas e eventos ativos.">
      <SafeActionForm action={upsertTvPresentationSettingsAction} className="grid-form" successMessage="Configurações da TV salvas.">
        <div className="field"><label htmlFor="slide-interval">Troca de slides (segundos)</label><input id="slide-interval" name="slideIntervalSeconds" type="number" min="5" max="120" defaultValue={payload.settings.slideIntervalSeconds} /></div>
        <div className="field"><label htmlFor="tv-match-source">Origem dos jogos</label><select id="tv-match-source" name="tvMatchSource" defaultValue={payload.settings.tvMatchSource}><option value="MANUAL">Jogos manuais</option><option value="TOURNAMENT">Jogos de torneios</option></select></div>
        <div className="field form-full"><label htmlFor="selected-tournament">Liga ou evento ativo para a premiação</label><select id="selected-tournament" name="selectedTournamentId" defaultValue={payload.settings.selectedTournamentId}><option value="">Não exibir premiação</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>Evento · {tournament.name} ({tournament.status})</option>)}{leagueCycles.map((cycle) => <option key={cycle.id} value={`league:${cycle.id}`}>Liga · {cycle.competition.category.name}{cycle.prizeDescription ? "" : " (sem premiação cadastrada)"}</option>)}</select></div>
        <div className="tv-settings-grid form-full">
          <label className="check-option tv-check-option"><input name="showMatches" type="checkbox" {...checked(payload.settings.showMatches)} /><span>Próximos jogos</span></label><label className="check-option tv-check-option"><input name="showCalendar" type="checkbox" {...checked(payload.settings.showCalendar)} /><span>Calendário da arena</span></label><label className="check-option tv-check-option"><input name="showSponsors" type="checkbox" {...checked(payload.settings.showSponsors)} /><span>Patrocinadores</span></label><label className="check-option tv-check-option"><input name="showMonthlyPrize" type="checkbox" {...checked(payload.settings.showMonthlyPrize)} /><span>Premiações de eventos</span></label><label className="check-option tv-check-option"><input name="showNightWinner" type="checkbox" {...checked(payload.settings.showNightWinner)} /><span>Destaque da noite</span></label>
        </div>
        <div className="form-full tv-sponsor-picker"><div className="split-row"><div><strong>Patrocinadores exibidos</strong><p className="muted">Selecione apenas as marcas que entram na rotação da TV.</p></div><Link href="/proximos-jogos/patrocinios" className="button button-secondary">Gerenciar patrocínios</Link></div><div className="tv-settings-grid">{payload.sponsors.length ? payload.sponsors.map((sponsor) => <label key={sponsor.id} className="check-option tv-check-option"><input name="selectedSponsorIds" type="checkbox" value={sponsor.id} defaultChecked={payload.settings.selectedSponsorIds.includes(sponsor.id)} /><span>{sponsor.name}</span></label>) : <p className="muted">Cadastre patrocinadores para selecioná-los aqui.</p>}</div></div>
        <div className="field"><label htmlFor="night-winner-title">Título do destaque</label><input id="night-winner-title" name="nightWinnerTitle" type="text" defaultValue={payload.settings.nightWinnerTitle} /></div><div className="field"><label htmlFor="night-winner-name">Nome do destaque</label><input id="night-winner-name" name="nightWinnerName" type="text" defaultValue={payload.settings.nightWinnerName} /></div><div className="field form-full"><label htmlFor="night-winner-description">Descrição do destaque</label><textarea id="night-winner-description" name="nightWinnerDescription" rows={3} defaultValue={payload.settings.nightWinnerDescription} /></div>
        <div className="form-full"><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className="button button-primary" /></div>
      </SafeActionForm>
    </SectionCard>
  </div>;
}
