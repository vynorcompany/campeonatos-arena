import { viewStyles } from "./page.utilities";
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

  return <div className={viewStyles.workspace_page_tv_settings_page}>
    <div className={viewStyles.tv_settings_toolbar}><Link href="/proximos-jogos/tv" className={viewStyles.button_button_primary} target="_blank" rel="noreferrer">Abrir TV</Link></div>
    <SafeActionForm action={upsertTvPresentationSettingsAction} className={viewStyles.tv_settings_form} successMessage="Configurações da TV salvas.">
      <section className={viewStyles.tv_config_section}><div className={viewStyles.tv_config_section_head}><h2>Ritmo e origem dos jogos</h2></div><div className={viewStyles.tv_config_fields}><div className={viewStyles.field}><label htmlFor="slide-interval">Troca de slides (segundos)</label><input id="slide-interval" name="slideIntervalSeconds" type="number" min="5" max="120" defaultValue={payload.settings.slideIntervalSeconds} /></div><TvMatchSourceFields initialSource={payload.settings.tvMatchSource} initialTournamentId={payload.settings.tvSourceTournamentId} tournaments={tournaments} manualMatches={manualMatches} /><div className={viewStyles.field_2}><label htmlFor="selected-tournament">Premiação exibida</label><select id="selected-tournament" name="selectedTournamentId" defaultValue={payload.settings.selectedTournamentId}><option value="">Não exibir premiação</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>Evento · {tournament.name} ({tournament.status})</option>)}{leagueCycles.map((cycle) => <option key={cycle.id} value={`league:${cycle.id}`}>Liga · {cycle.competition.category.name}{cycle.prizeDescription ? "" : " (sem premiação cadastrada)"}</option>)}</select></div></div></section>
      <section className={viewStyles.tv_config_section_2}><div className={viewStyles.tv_config_section_head}><span>CONTEÚDO</span><strong>Slides ativos</strong></div><div className={viewStyles.tv_slide_options}><label className={viewStyles.tv_slide_option}><input name="showMatches" type="checkbox" {...checked(payload.settings.showMatches)} /><span className={viewStyles.tv_slide_option_check} aria-hidden="true">✓</span><span><b>Jogos</b><small>Exibe somente os jogos cadastrados para a origem selecionada.</small></span></label><label className={viewStyles.tv_slide_option}><input name="showSponsors" type="checkbox" {...checked(payload.settings.showSponsors)} /><span className={viewStyles.tv_slide_option_check} aria-hidden="true">✓</span><span><b>Patrocinadores</b><small>Marcas selecionadas entram na rotação.</small></span></label><label className={viewStyles.tv_slide_option}><input name="showRanking" type="checkbox" {...checked(payload.settings.showRanking)} /><span className={viewStyles.tv_slide_option_check} aria-hidden="true">✓</span><span><b>Ranking do evento ativo</b><small>Classificação atualizada da competição.</small></span></label><label className={viewStyles.tv_slide_option}><input name="showMonthlyPrize" type="checkbox" {...checked(payload.settings.showMonthlyPrize)} /><span className={viewStyles.tv_slide_option_check} aria-hidden="true">✓</span><span><b>Premiações de eventos</b><small>Premiações configuradas na arena.</small></span></label></div></section>
      {payload.settings.selectedSponsorIds.map((id) => <input key={id} type="hidden" name="selectedSponsorIds" value={id} />)}
      <footer className={viewStyles.tv_settings_actions}><span>As alterações entram na próxima atualização da TV.</span><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer>
    </SafeActionForm>
  </div>;
}
