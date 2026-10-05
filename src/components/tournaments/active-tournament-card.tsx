import { viewStyles } from "./active-tournament-card.utilities";
﻿import Link from "next/link";
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
      <article className={viewStyles.t_active_card}>
        <div className={viewStyles.stack_xs}>
          <h2>Nenhum torneio ativo</h2>
          <p className={viewStyles.muted}>Crie um novo torneio para começar inscrições, montagem de chave e jogos.</p>
        </div>
        <Link href="/torneios/novo" className={viewStyles.button_button_primary}>Novo torneio</Link>
      </article>
    );
  }

  const done = tournament.matches.filter((match) => !!match.winnerPairId).length;
  const progress = tournament.matches.length ? Math.round((done / tournament.matches.length) * 100) : 0;

  return (
    <article className={viewStyles.t_active_card}>
      <div className={viewStyles.t_active_head}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Torneio ativo</p>
          <h2>{tournament.name}</h2>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      <div className={viewStyles.t_active_stats}>
        <span><strong>{tournament.entries.length}</strong> jogadores</span>
        <span><strong>{tournament.pairs.length}</strong> duplas</span>
        <span><strong>{tournament.groups.length}</strong> grupos</span>
      </div>

      <div className={viewStyles.t_progress_wrap}>
        <div className={viewStyles.t_progress_meta}>
          <span>Progresso do torneio</span>
          <strong>{progress}%</strong>
        </div>
        <div className={viewStyles.t_progress_bar}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={viewStyles.section_actions}>
        <Link href={`/torneios/${tournament.id}`} className={viewStyles.button_button_primary}>Abrir torneio</Link>
        <Link href={`/torneios/${tournament.id}?tab=settings`} className={viewStyles.button}>Configurações</Link>
      </div>
      <PublicRegistrationLinkActions slug={tournament.publicSlug} />
    </article>
  );
}
