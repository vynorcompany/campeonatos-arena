import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { TvMatchSourceFields } from "@/components/tv-match-source-fields";
import { upsertTvPresentationSettingsAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getManualUpcomingMatchesPayload, getTvPresentationPayload } from "@/lib/services/tv-presentation";

function checked(value: boolean) { return value ? { defaultChecked: true } : {}; }

export default async function TvPresentationSettingsPage() {
  const auth = await requireModuleView("tv");
  const [payload, tournaments, leagueCycles, manualMatches] = await Promise.all([
    getTvPresentationPayload(auth.arenaId),
    prisma.tournament.findMany({ where: { arenaId: auth.arenaId, status: { not: "FINISHED" } }, orderBy: [{ createdAt: "desc" }], select: { id: true, name: true, status: true } }),
    prisma.leagueCycle.findMany({ where: { status: "OPEN", competition: { category: { tournament: { arenaId: auth.arenaId } } } }, orderBy: [{ updatedAt: "desc" }], select: { id: true, prizeDescription: true, competition: { select: { category: { select: { name: true } } } } } }),
    getManualUpcomingMatchesPayload(auth.arenaId)
  ]);

  return <div className="workspace-page tv-settings-page">
    <div className="tv-settings-toolbar"><Link href="/proximos-jogos/tv" className="button button-primary" target="_blank" rel="noreferrer">Abrir TV</Link></div>
    <SafeActionForm action={upsertTvPresentationSettingsAction} className="tv-settings-form" successMessage="Configurações da TV salvas.">
      <section className="tv-config-section tv-config-basics"><div className="tv-config-section-head"><h2>Ritmo e origem dos jogos</h2></div><div className="tv-config-fields"><div className="field"><label htmlFor="slide-interval">Troca de slides (segundos)</label><input id="slide-interval" name="slideIntervalSeconds" type="number" min="5" max="120" defaultValue={payload.settings.slideIntervalSeconds} /></div><TvMatchSourceFields initialSource={payload.settings.tvMatchSource} initialTournamentId={payload.settings.tvSourceTournamentId} tournaments={tournaments} manualMatches={manualMatches} /><div className="field tv-prize-select"><label htmlFor="selected-tournament">Premiação exibida</label><select id="selected-tournament" name="selectedTournamentId" defaultValue={payload.settings.selectedTournamentId}><option value="">Não exibir premiação</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>Evento · {tournament.name} ({tournament.status})</option>)}{leagueCycles.map((cycle) => <option key={cycle.id} value={`league:${cycle.id}`}>Liga · {cycle.competition.category.name}{cycle.prizeDescription ? "" : " (sem premiação cadastrada)"}</option>)}</select></div></div></section>
      <section className="tv-config-section"><div className="tv-config-section-head"><span>CONTEÚDO</span><strong>Slides ativos</strong></div><div className="tv-slide-options"><label className="tv-slide-option"><input name="showMatches" type="checkbox" {...checked(payload.settings.showMatches)} /><span className="tv-slide-option-check" aria-hidden="true">✓</span><span><b>Jogos</b><small>Exibe somente os jogos cadastrados para a origem selecionada.</small></span></label><label className="tv-slide-option"><input name="showSponsors" type="checkbox" {...checked(payload.settings.showSponsors)} /><span className="tv-slide-option-check" aria-hidden="true">✓</span><span><b>Patrocinadores</b><small>Marcas selecionadas entram na rotação.</small></span></label><label className="tv-slide-option"><input name="showRanking" type="checkbox" {...checked(payload.settings.showRanking)} /><span className="tv-slide-option-check" aria-hidden="true">✓</span><span><b>Ranking do evento ativo</b><small>Classificação atualizada da competição.</small></span></label><label className="tv-slide-option"><input name="showMonthlyPrize" type="checkbox" {...checked(payload.settings.showMonthlyPrize)} /><span className="tv-slide-option-check" aria-hidden="true">✓</span><span><b>Premiações de eventos</b><small>Premiações configuradas na arena.</small></span></label></div></section>
      {payload.settings.selectedSponsorIds.map((id) => <input key={id} type="hidden" name="selectedSponsorIds" value={id} />)}
      <footer className="tv-settings-actions"><span>As alterações entram na próxima atualização da TV.</span><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className="button button-primary" /></footer>
    </SafeActionForm>
  </div>;
}
