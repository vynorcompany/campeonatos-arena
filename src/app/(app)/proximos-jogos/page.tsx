import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import Link from "next/link";
import {
  createManualUpcomingMatchAction,
  deleteManualUpcomingMatchAction,
  updateManualUpcomingMatchAction
} from "@/lib/actions/upcoming-match";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function formatMatchLine(match: { homePairName: string; awayPairName: string; courtName: string }) {
  const homePairName = match.homePairName.trim() || "DUPLA 1";
  const awayPairName = match.awayPairName.trim() || "DUPLA 2";
  const courtName = match.courtName.trim() || "QUADRA A DEFINIR";

  return `${homePairName} VS ${awayPairName} - ${courtName}`;
}

export default async function UpcomingMatchesPage() {
  const auth = await requireArenaAccess();
  const manualMatches = await prisma.manualUpcomingMatch.findMany({
    where: {
      arenaId: auth.arenaId
    },
    orderBy: [
      {
        displayOrder: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });

  return (
    <div className="stack-md">
      <header className="page-header page-header-showcase">
        <div className="stack-xs">
          <p className="eyebrow">Apresentacao</p>
          <h1>Proximos jogos</h1>
          <p className="muted">
            Monte manualmente a fila do fim de semana com dupla 1, dupla 2 e quadra para cada jogo.
          </p>
        </div>
      </header>

      <section className="manual-upcoming-preview" aria-label="Previa dos proximos jogos">
        <div className="manual-upcoming-preview-head">
          <p className="manual-upcoming-title">PROXIMOS JOGOS</p>
          <Link href="/proximos-jogos/tv" className="button button-primary" target="_blank" rel="noreferrer">
            Abrir tela da TV
          </Link>
        </div>
        {manualMatches.length ? (
          <div className="manual-upcoming-lines">
            {manualMatches.map((match) => (
              <p key={match.id}>{formatMatchLine(match)}</p>
            ))}
          </div>
        ) : (
          <p className="manual-upcoming-empty">Nenhum jogo cadastrado.</p>
        )}
      </section>

      <SectionCard
        title="Editar proximos jogos"
        description="Cada linha tem um campo para cada dupla e um campo para a quadra. As alteracoes aparecem na previa acima."
      >
        <div className="manual-upcoming-editor">
          <form action={createManualUpcomingMatchAction} className="manual-upcoming-row manual-upcoming-row-new">
            <div className="field">
              <label htmlFor="new-home-pair">Dupla 1</label>
              <input id="new-home-pair" name="homePairName" type="text" placeholder="DUPLA 1" />
            </div>
            <div className="field">
              <label htmlFor="new-away-pair">Dupla 2</label>
              <input id="new-away-pair" name="awayPairName" type="text" placeholder="DUPLA 2" />
            </div>
            <div className="field">
              <label htmlFor="new-court">Quadra</label>
              <input id="new-court" name="courtName" type="text" placeholder="QUADRA AGECON" />
            </div>
            <div className="manual-upcoming-submit">
              <SubmitButton label="Adicionar" pendingLabel="Salvando..." className="button button-primary" />
            </div>
          </form>

          {manualMatches.length ? (
            <div className="manual-upcoming-list">
              {manualMatches.map((match) => (
                <form key={match.id} action={updateManualUpcomingMatchAction} className="manual-upcoming-row">
                  <input type="hidden" name="matchId" value={match.id} />
                  <div className="field manual-upcoming-order-field">
                    <label htmlFor={`${match.id}-order`}>Ordem</label>
                    <input id={`${match.id}-order`} name="displayOrder" type="number" min="1" defaultValue={match.displayOrder} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${match.id}-home`}>Dupla 1</label>
                    <input id={`${match.id}-home`} name="homePairName" type="text" defaultValue={match.homePairName} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${match.id}-away`}>Dupla 2</label>
                    <input id={`${match.id}-away`} name="awayPairName" type="text" defaultValue={match.awayPairName} />
                  </div>
                  <div className="field">
                    <label htmlFor={`${match.id}-court`}>Quadra</label>
                    <input id={`${match.id}-court`} name="courtName" type="text" defaultValue={match.courtName} />
                  </div>
                  <div className="manual-upcoming-actions">
                    <SubmitButton label="Salvar" pendingLabel="..." className="button button-primary" />
                    <button
                      type="submit"
                      formAction={deleteManualUpcomingMatchAction}
                      className="button button-danger"
                    >
                      Remover
                    </button>
                  </div>
                </form>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
