import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { generateCategoryBracketAction, updateCategoryBracketMatchScheduleAction, updateTournamentCategoryFormatAction } from "@/lib/actions/tournament";
import { getTournamentScheduleConflicts } from "@/lib/services/tournament";

type BracketItem = {
  categoryId: string;
  matches: Array<{
    id: string;
    label: string;
    homeRegistration: { leadName: string; partnerName: string } | null;
    awayRegistration: { leadName: string; partnerName: string } | null;
    scheduledTime: string;
    courtName: string;
  }>;
};

export default async function TournamentRegistrationsPage() {
  const auth = await requireModuleView("tournaments");
  let tournament: any = null;
  let categoryBrackets: BracketItem[] = [];

  try {
    tournament = await prisma.tournament.findFirst({
      where: {
        arenaId: auth.arenaId,
        status: {
          not: "FINISHED"
        }
      },
      include: {
        categories: {
          where: { active: true },
          orderBy: { level: "asc" },
          include: {
            registrations: {
              orderBy: { createdAt: "asc" }
            }
          }
        },
        categoryBrackets: {
          include: {
            category: true,
            matches: {
              include: {
                homeRegistration: true,
                awayRegistration: true
              },
              orderBy: { roundOrder: "asc" }
            }
          }
        }
      }
    });
    categoryBrackets = tournament?.categoryBrackets ?? [];
  } catch {
    tournament = await prisma.tournament.findFirst({
      where: {
        arenaId: auth.arenaId,
        status: {
          not: "FINISHED"
        }
      },
      include: {
        categories: {
          where: { active: true },
          orderBy: { level: "asc" },
          include: {
            registrations: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });
  }

  if (!tournament) {
    return <SectionCard title="Inscrições"><p className="muted">Nenhum torneio ativo.</p></SectionCard>;
  }

  const conflicts = await getTournamentScheduleConflicts(tournament.id, auth.arenaId);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Torneios</p>
          <h1>Inscritos por categoria</h1>
          <p className="muted">Gerencie inscrições e, após encerrar inscrições, defina formato e monte o chaveamento por categoria.</p>
        </div>
      </header>

      {tournament.registrationPhase === "REGISTRATIONS" ? (
        <SectionCard title="Inscrições em andamento">
          <p className="muted">
            A montagem só é liberada após encerrar inscrições. Quando mudar a fase do torneio, você poderá definir grupos e duplas por grupo em cada categoria.
          </p>
        </SectionCard>
      ) : null}

      <SectionCard title="Conflitos de agenda (jogos gerais)" description="Validador para evitar atleta em dois jogos no mesmo horário.">
        {conflicts.length ? (
          <ul className="simple-list">
            {conflicts.map((conflict) => (
              <li key={`${conflict.playerId}-${conflict.scheduledTime}`} className="simple-item">
                <strong>{conflict.scheduledTime}</strong>
                <span>{conflict.labels.join(" | ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhum conflito detectado.</p>
        )}
      </SectionCard>

      {tournament.categories.map((category: any) => {
        const bracket = categoryBrackets.find((item) => item.categoryId === category.id);
        const confirmedCount = category.registrations.filter((reg: any) => reg.status === "CONFIRMED").length;
        return (
          <SectionCard key={category.id} title={`${category.name} (${confirmedCount} confirmadas)`}>
            <div className="stack-sm" style={{ marginBottom: "0.75rem" }}>
              <form action={updateTournamentCategoryFormatAction} className="section-actions">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="categoryId" value={category.id} />
                <select name="groupCount" defaultValue={String((category as any).groupCount ?? 4)} disabled={tournament.registrationPhase === "REGISTRATIONS"}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1} grupos</option>
                  ))}
                </select>
                <select name="pairsPerGroup" defaultValue={String((category as any).pairsPerGroup ?? 3)} disabled={tournament.registrationPhase === "REGISTRATIONS"}>
                  {Array.from({ length: 15 }).map((_, index) => (
                    <option key={index + 2} value={index + 2}>{index + 2} duplas/grupo</option>
                  ))}
                </select>
                <SubmitButton label="Salvar formato" pendingLabel="Salvando..." className="button" />
              </form>
              {tournament.registrationPhase === "REGISTRATIONS" ? (
                <button type="button" className="button button-primary" disabled>
                  Montar chaveamento da categoria
                </button>
              ) : (
                <form action={generateCategoryBracketAction} className="section-actions">
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <SubmitButton
                    label="Montar chaveamento da categoria"
                    pendingLabel="Montando..."
                    className="button button-primary"
                  />
                </form>
              )}
            </div>

            <div className="simple-list">
              {category.registrations.map((registration: any) => (
                <div key={registration.id} className="simple-item">
                  <strong>{registration.leadName} / {registration.partnerName}</strong>
                  <span>{registration.status} · {registration.paymentStatus} · R$ {(registration.amountCents / 100).toFixed(2)}</span>
                </div>
              ))}
              {!category.registrations.length ? <p className="muted">Sem inscrições.</p> : null}
            </div>

            {bracket ? (
              <div className="stack-sm" style={{ marginTop: "1rem" }}>
                <strong>Jogos da chave</strong>
                {bracket.matches.map((match) => (
                  <form key={match.id} action={updateCategoryBracketMatchScheduleAction} className="simple-item">
                    <input type="hidden" name="matchId" value={match.id} />
                    <span>{match.label}: {match.homeRegistration?.leadName ?? "A definir"} / {match.homeRegistration?.partnerName ?? "-"} x {match.awayRegistration?.leadName ?? "A definir"} / {match.awayRegistration?.partnerName ?? "-"}</span>
                    <div className="section-actions">
                      <input name="scheduledTime" defaultValue={match.scheduledTime} placeholder="18:00" />
                      <input name="courtName" defaultValue={match.courtName} placeholder="Quadra" />
                      <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                    </div>
                  </form>
                ))}
              </div>
            ) : null}
          </SectionCard>
        );
      })}
    </div>
  );
}

