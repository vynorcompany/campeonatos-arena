import Link from "next/link";
import { PublicRegistrationLinkActions } from "@/components/tournaments/public-registration-link-actions";
import { StatusBadge } from "@/components/tournaments/status-badge";

type ActiveTournamentCardProps = {
  tournament: {
    id: string;
    name: string;
    publicSlug: string;
    status: string;
    entries: Array<unknown>;
    pairs: Array<unknown>;
    groups: Array<unknown>;
    matches: Array<{ winnerPairId: string | null }>;
  } | null;
};

export function ActiveTournamentCard({ tournament }: ActiveTournamentCardProps) {
  if (!tournament) {
    return (
      <article className="t-active-card">
        <div className="stack-xs">
          <h2>Nenhum torneio ativo</h2>
          <p className="muted">Crie um novo torneio para começar inscrições, montagem de chave e jogos.</p>
        </div>
        <Link href="/torneios/novo" className="button button-primary">Novo torneio</Link>
      </article>
    );
  }

  const done = tournament.matches.filter((match) => !!match.winnerPairId).length;
  const progress = tournament.matches.length ? Math.round((done / tournament.matches.length) * 100) : 0;

  return (
    <article className="t-active-card">
      <div className="t-active-head">
        <div className="stack-xs">
          <p className="eyebrow">Torneio ativo</p>
          <h2>{tournament.name}</h2>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      <div className="t-active-stats">
        <span><strong>{tournament.entries.length}</strong> jogadores</span>
        <span><strong>{tournament.pairs.length}</strong> duplas</span>
        <span><strong>{tournament.groups.length}</strong> grupos</span>
      </div>

      <div className="t-progress-wrap">
        <div className="t-progress-meta">
          <span>Progresso do torneio</span>
          <strong>{progress}%</strong>
        </div>
        <div className="t-progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="section-actions">
        <Link href={`/torneios/${tournament.id}`} className="button button-primary">Abrir torneio</Link>
        <Link href={`/torneios/${tournament.id}?tab=settings`} className="button">Configurações</Link>
      </div>
      <PublicRegistrationLinkActions slug={tournament.publicSlug} />
    </article>
  );
}
