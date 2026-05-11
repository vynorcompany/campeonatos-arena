import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import {
  createTvSponsorAction,
  deleteTvSponsorAction,
  updateTvSponsorAction,
  upsertTvPresentationSettingsAction
} from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getTvPresentationPayload } from "@/lib/services/tv-presentation";

function checked(value: boolean) {
  return value ? { defaultChecked: true } : {};
}

function splitMonthlyPrize(description: string) {
  const [second = "", third = ""] = description
    .split("|")
    .map((item) => item.trim());

  return { second, third };
}

export default async function TvPresentationSettingsPage() {
  const auth = await requireModuleView("tv");
  const [payload, tournaments, rankings] = await Promise.all([
    getTvPresentationPayload(auth.arenaId),
    prisma.tournament.findMany({
      where: { arenaId: auth.arenaId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true
      }
    }),
    prisma.rankingProfile.findMany({
      where: { arenaId: auth.arenaId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true
      }
    })
  ]);

  const monthlyPrize = splitMonthlyPrize(payload.settings.monthlyPrizeDescription);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Tela da TV</p>
          <h1>Apresentação em slides</h1>
          <p className="muted">
            Escolha quais blocos aparecem na TV, organize os patrocinadores e ajuste o tempo de troca do slideshow.
          </p>
        </div>
        <Link href="/proximos-jogos/tv" className="button button-primary" target="_blank" rel="noreferrer">
          Abrir TV
        </Link>
      </header>

      <SectionCard
        title="Slides exibidos"
        description="Você pode ativar ou ocultar cada bloco da TV. Os patrocinadores entram um por vez na rotação."
      >
        <SafeActionForm action={upsertTvPresentationSettingsAction} className="grid-form" successMessage="Configurações da TV salvas.">
          <div className="field">
            <label htmlFor="slide-interval">Troca de slides (segundos)</label>
            <input
              id="slide-interval"
              name="slideIntervalSeconds"
              type="number"
              min="5"
              max="120"
              defaultValue={payload.settings.slideIntervalSeconds}
            />
          </div>

          <div className="field">
            <label htmlFor="selected-tournament">Torneio para o ranking da TV</label>
            <select id="selected-tournament" name="selectedTournamentId" defaultValue={payload.settings.selectedTournamentId}>
              <option value="">Ranking geral da arena</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} ({tournament.status})
                </option>
              ))}
            </select>
          </div>

          <div className="field form-full">
            <label>Rankings adicionais na rotação</label>
            <div className="tv-settings-grid">
              {rankings.length ? (
                rankings.map((ranking) => (
                  <label key={ranking.id} className="check-option tv-check-option">
                    <input
                      name="selectedRankingIds"
                      type="checkbox"
                      value={ranking.id}
                      defaultChecked={payload.settings.selectedRankingIds.includes(ranking.id)}
                    />
                    <span>{ranking.name}</span>
                  </label>
                ))
              ) : (
                <p className="muted">Nenhum ranking cadastrado.</p>
              )}
            </div>
          </div>

          <div className="tv-settings-grid form-full">
            <label className="check-option tv-check-option">
              <input name="showMatches" type="checkbox" {...checked(payload.settings.showMatches)} />
              <span>Próximos jogos</span>
            </label>
            <label className="check-option tv-check-option">
              <input name="showCalendar" type="checkbox" {...checked(payload.settings.showCalendar)} />
              <span>Calendário da arena</span>
            </label>
            <label className="check-option tv-check-option">
              <input name="showSponsors" type="checkbox" {...checked(payload.settings.showSponsors)} />
              <span>Patrocinadores</span>
            </label>
            <label className="check-option tv-check-option">
              <input name="showRanking" type="checkbox" {...checked(payload.settings.showRanking)} />
              <span>Ranking</span>
            </label>
            <label className="check-option tv-check-option">
              <input name="showMonthlyPrize" type="checkbox" {...checked(payload.settings.showMonthlyPrize)} />
              <span>Premiação mensal</span>
            </label>
            <label className="check-option tv-check-option">
              <input name="showNightWinner" type="checkbox" {...checked(payload.settings.showNightWinner)} />
              <span>Vencedor da noite</span>
            </label>
          </div>

          <div className="field">
            <label htmlFor="monthly-prize-title">Título da premiação</label>
            <input id="monthly-prize-title" name="monthlyPrizeTitle" type="text" defaultValue={payload.settings.monthlyPrizeTitle} />
          </div>
          <div className="field">
            <label htmlFor="monthly-prize-first">1º lugar</label>
            <input id="monthly-prize-first" name="monthlyPrizeFirst" type="text" defaultValue={payload.settings.monthlyPrizeAmount} />
          </div>
          <div className="field">
            <label htmlFor="monthly-prize-second">2º lugar</label>
            <input id="monthly-prize-second" name="monthlyPrizeSecond" type="text" defaultValue={monthlyPrize.second} />
          </div>
          <div className="field form-full">
            <label htmlFor="monthly-prize-third">3º lugar</label>
            <input id="monthly-prize-third" name="monthlyPrizeThird" type="text" defaultValue={monthlyPrize.third} />
          </div>

          <div className="field">
            <label htmlFor="night-winner-title">Título do vencedor</label>
            <input id="night-winner-title" name="nightWinnerTitle" type="text" defaultValue={payload.settings.nightWinnerTitle} />
          </div>
          <div className="field">
            <label htmlFor="night-winner-name">Nome do vencedor</label>
            <input id="night-winner-name" name="nightWinnerName" type="text" defaultValue={payload.settings.nightWinnerName} />
          </div>
          <div className="field form-full">
            <label htmlFor="night-winner-description">Descrição do vencedor</label>
            <textarea
              id="night-winner-description"
              name="nightWinnerDescription"
              rows={3}
              defaultValue={payload.settings.nightWinnerDescription}
            />
          </div>

          <div className="form-full">
            <SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard
        title="Patrocinadores"
        description="Cada patrocinador aparece em um slide próprio, com o título do plano no topo e a logo em destaque."
      >
        <div className="manual-upcoming-editor">
          <SafeActionForm action={createTvSponsorAction} className="manual-upcoming-row manual-upcoming-row-new tv-sponsor-row" resetOnSuccess successMessage="Patrocinador adicionado.">
            <div className="field">
              <label htmlFor="new-sponsor-order">Ordem</label>
              <input id="new-sponsor-order" name="displayOrder" type="number" min="1" defaultValue={payload.sponsors.length + 1} />
            </div>
            <div className="field">
              <label htmlFor="new-sponsor-name">Nome do patrocinador</label>
              <input id="new-sponsor-name" name="name" type="text" placeholder="Ex.: Marca parceira" />
            </div>
            <div className="field">
              <label htmlFor="new-sponsor-subtitle">Título do plano</label>
              <input id="new-sponsor-subtitle" name="subtitle" type="text" placeholder="Ex.: Patrocinador Platinum" />
            </div>
            <div className="field">
              <label htmlFor="new-sponsor-logo">Logo</label>
              <input id="new-sponsor-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            </div>
            <div className="manual-upcoming-submit">
              <SubmitButton label="Adicionar" pendingLabel="Salvando..." className="button button-primary" />
            </div>
          </SafeActionForm>

          {payload.sponsors.length ? (
            <div className="manual-upcoming-list">
              {payload.sponsors.map((sponsor: (typeof payload.sponsors)[number]) => (
                <div key={sponsor.id}>
                <SafeActionForm
                  action={updateTvSponsorAction}
                  className="manual-upcoming-row tv-sponsor-row"
                  successMessage="Patrocinador atualizado."
                >
                  <input type="hidden" name="sponsorId" value={sponsor.id} />
                  <div className="field">
                    <label htmlFor={`${sponsor.id}-order`}>Ordem</label>
                    <input id={`${sponsor.id}-order`} name="displayOrder" type="number" min="1" defaultValue={sponsor.displayOrder} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${sponsor.id}-name`}>Nome do patrocinador</label>
                    <input id={`${sponsor.id}-name`} name="name" type="text" defaultValue={sponsor.name} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${sponsor.id}-subtitle`}>Título do plano</label>
                    <input id={`${sponsor.id}-subtitle`} name="subtitle" type="text" defaultValue={sponsor.subtitle} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${sponsor.id}-logo`}>Nova logo</label>
                    <input id={`${sponsor.id}-logo`} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
                    {sponsor.logoUrl ? <img src={sponsor.logoUrl} alt={`Logo de ${sponsor.name}`} className="tv-sponsor-form-logo" /> : null}
                  </div>
                  <div className="manual-upcoming-actions">
                    <SubmitButton label="Salvar" pendingLabel="..." className="button button-primary" />
                  </div>
                </SafeActionForm>
                <SafeActionForm action={deleteTvSponsorAction} successMessage="Patrocinador excluido.">
                  <input type="hidden" name="sponsorId" value={sponsor.id} />
                  <SubmitButton label="Excluir" pendingLabel="Excluindo..." className="button button-danger" />
                </SafeActionForm>
                </div>
              ))}
            </div>
          ) : (
            <p className="manual-upcoming-empty">Nenhum patrocinador cadastrado.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Preview do ranking"
        description={
          payload.settings.selectedTournamentName
            ? `O slide de ranking mostra apenas os inscritos em ${payload.settings.selectedTournamentName}.`
            : "O slide de ranking usa automaticamente os jogadores ativos com maior pontuação."
        }
      >
        {payload.ranking.length ? (
          <div className="tv-ranking-preview">
            {payload.ranking.map((player: (typeof payload.ranking)[number], index: number) => (
              <div className="tv-ranking-preview-row" key={player.id}>
                <strong>#{index + 1}</strong>
                <span>{player.name}</span>
                <small>{player.points} pts</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="manual-upcoming-empty">Nenhum jogador ativo no ranking.</p>
        )}
      </SectionCard>
    </div>
  );
}
