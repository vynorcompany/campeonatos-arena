import Link from "next/link";
import { BracketOverview } from "@/components/bracket-overview";
import { TournamentCategoryManagerForm } from "@/components/forms/tournament-category-manager-form";
import { TournamentForm } from "@/components/forms/tournament-form";
import { TournamentParticipantsForm } from "@/components/forms/tournament-participants-form";
import { EmptyState } from "@/components/tournaments/empty-state";
import { MetricCard } from "@/components/tournaments/metric-card";

type TournamentDetails = Awaited<ReturnType<typeof import("@/lib/services/tournament").getTournamentDetailsById>>;

export function TournamentOverviewTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  const done = tournament.matches.filter((match) => !!match.winnerPairId).length;
  return (
    <div className="stack-md">
      <div className="t-metric-grid">
        <MetricCard label="Jogadores" value={tournament.entries.length} />
        <MetricCard label="Duplas" value={tournament.pairs.length} />
        <MetricCard label="Grupos" value={tournament.groups.length} />
        <MetricCard label="Jogos concluídos" value={`${done}/${tournament.matches.length}`} />
      </div>
      <div className="section-card">
        <h3>Próximas ações recomendadas</h3>
        <p className="muted">Siga a ordem operacional do torneio com atalhos diretos.</p>
        <div className="section-actions">
          <Link href={`/torneios/${tournament.id}?tab=participants`} className="button">Participantes</Link>
          <Link href={`/torneios/${tournament.id}?tab=pairs`} className="button">Duplas</Link>
          <Link href={`/torneios/${tournament.id}?tab=groups`} className="button">Grupos</Link>
          <Link href={`/torneios/${tournament.id}?tab=games`} className="button button-primary">Jogos</Link>
        </div>
      </div>
    </div>
  );
}

export function TournamentParticipantsTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  const selectedPlayerIds = new Set(tournament.entries.map((entry) => entry.playerId));
  const shouldUseArenaPlayers = tournament.creationMode === "MANUAL";

  if (shouldUseArenaPlayers) {
    return (
      <TournamentParticipantsForm
        tournamentId={tournament.id}
        players={tournament.arena.players.map((player) => ({
          id: player.id,
          name: player.name,
          points: player.points,
          checked: selectedPlayerIds.has(player.id)
        }))}
      />
    );
  }

  return (
    <TournamentParticipantsForm
      tournamentId={tournament.id}
      categories={tournament.categories.map((category) => ({ id: category.id, name: category.name }))}
      registrations={tournament.publicRegistrations.map((registration) => ({
        id: registration.id,
        categoryId: registration.categoryId,
        leadName: registration.leadName,
        leadPhone: registration.leadPhone,
        leadCpf: registration.leadCpf,
        leadBirthDate: registration.leadBirthDate.toISOString(),
        partnerName: registration.partnerName,
        partnerPhone: registration.partnerPhone,
        partnerCpf: registration.partnerCpf,
        partnerBirthDate: registration.partnerBirthDate.toISOString(),
        categoryName: registration.category.name,
        amountCents: registration.amountCents,
        paymentStatus: registration.paymentStatus,
        status: registration.status,
        createdAt: registration.createdAt.toISOString()
      }))}
    />
  );
}

export function TournamentCategoriesTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  return (
    <div className="stack-md">
      <article className="section-card">
        <h3>Categorias do torneio</h3>
        <p className="muted">Lista de categorias ativas e ordem usada nas inscricoes.</p>
        <div className="simple-list">
          {tournament.categories.map((category, index) => (
            <div key={category.id} className="simple-item">
              <strong>{category.name}</strong>
              <span>
                Nivel #{category.level || index + 1} · Adic. 2ª: R$ {(category.priceSecondCents / 100).toFixed(2)} · Adic. 3ª+: R$ {(category.priceThirdCents / 100).toFixed(2)}
              </span>
            </div>
          ))}
          {!tournament.categories.length ? <p className="muted">Sem categorias cadastradas.</p> : null}
        </div>
      </article>
      <article className="section-card">
        <h3>Editar e criar categorias</h3>
        <TournamentCategoryManagerForm
          tournamentId={tournament.id}
          defaultName={tournament.name}
          defaultDescription={tournament.description}
          defaultPublicSlug={tournament.publicSlug}
          defaultRegistrationPhase={tournament.registrationPhase}
          defaultCreationMode={tournament.creationMode as "MANUAL" | "PUBLIC"}
          defaultGroupCount={tournament.groupCount}
          defaultPairsPerGroup={tournament.pairsPerGroup}
          defaultPriceFirstCents={tournament.priceFirstCents}
          defaultPriceSecondCents={tournament.priceSecondCents}
          defaultPriceThirdCents={tournament.priceThirdCents}
          defaultBlockCategoryGap={tournament.blockCategoryGap}
          defaultMaxCategoryGap={tournament.maxCategoryGap}
          defaultRankingId={tournament.rankingId ?? ""}
          defaultCategories={tournament.categories.map((category) => ({
            name: category.name,
            priceSecondCents: category.priceSecondCents ?? 0,
            priceThirdCents: category.priceThirdCents ?? 0
          }))}
        />
      </article>
      <div className="section-actions">
        <Link href="/torneios/inscricoes" className="button">Gerenciar inscricoes por categoria</Link>
      </div>
    </div>
  );
}

export function TournamentPairsTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  if (!tournament.pairs.length) {
    return <EmptyState title="Sem duplas montadas" description="Monte as duplas antes de distribuir os grupos." ctaLabel="Abrir Duplas" ctaHref="/duplas" />;
  }
  return (
    <div className="simple-list">
      {tournament.pairs.map((pair) => (
        <div key={pair.id} className="simple-item">
          <strong>{pair.name}</strong>
          <span>{pair.totalPoints} pts · {pair.group?.name ?? "Sem grupo"}</span>
        </div>
      ))}
    </div>
  );
}

export function TournamentGroupsTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  if (!tournament.groups.length) {
    return <EmptyState title="Sem grupos montados" description="Distribua as duplas para montar os grupos do torneio." ctaLabel="Abrir Grupos" ctaHref="/grupos" />;
  }
  return (
    <div className="group-grid">
      {tournament.groups.map((group) => (
        <article className="section-card" key={group.id}>
          <h3>{group.name}</h3>
          <p className="muted">{group.pairs.length} duplas</p>
          <div className="group-list">
            {group.pairs.map((pair) => <div key={pair.id} className="group-item"><strong>{pair.name}</strong><span>{pair.totalPoints} pts</span></div>)}
          </div>
        </article>
      ))}
    </div>
  );
}

export function TournamentGamesTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  const scheduled = tournament.matches.filter((match) => !match.winnerPairId && (match.manualStatus ?? "WAITING") === "WAITING");
  const live = tournament.matches.filter((match) => !match.winnerPairId && match.manualStatus === "LIVE");
  const finished = tournament.matches.filter((match) => !!match.winnerPairId || match.manualStatus === "FINISHED");
  const board = [
    { key: "agendados", title: "Agendados", items: scheduled },
    { key: "quadra", title: "Em quadra", items: live },
    { key: "finalizados", title: "Finalizados", items: finished }
  ];
  return (
    <div className="t-board-grid">
      {board.map((column) => (
        <article className="section-card" key={column.key}>
          <h3>{column.title}</h3>
          <div className="simple-list">
            {column.items.map((match) => (
              <div className="simple-item" key={match.id}>
                <strong>{match.label}</strong>
                <span>{match.homePair?.name ?? "A definir"} x {match.awayPair?.name ?? "A definir"}</span>
              </div>
            ))}
            {!column.items.length ? <p className="muted">Nenhum jogo nesta coluna.</p> : null}
          </div>
        </article>
      ))}
      <div className="section-actions">
        <Link href="/jogos" className="button button-primary">Abrir gestão completa de jogos</Link>
      </div>
    </div>
  );
}

export function TournamentBracketTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  const knockout = tournament.matches.filter((match) => match.stage !== "GROUP");
  if (!tournament.matches.length) {
    return <EmptyState title="Chave ainda não gerada" description="Monte grupos e gere jogos para visualizar a chave." ctaLabel="Gerar jogos" ctaHref="/jogos" />;
  }
  return (
    <div className="stack-md">
      <article className="section-card"><h3>Fase de grupos</h3><p className="muted">{tournament.matches.filter((match) => match.stage === "GROUP").length} jogos</p></article>
      <article className="section-card"><h3>Mata-mata</h3><BracketOverview groupCount={tournament.groupCount} groups={tournament.groups} matches={knockout} /></article>
    </div>
  );
}

export function TournamentResultsTab({ tournament }: { tournament: NonNullable<TournamentDetails> }) {
  const finals = tournament.matches.filter((match) => match.stage === "FINAL");
  const champion = finals.find((match) => !!match.winnerPair)?.winnerPair?.name ?? "A definir";
  return (
    <div className="stack-md">
      <article className="section-card"><h3>Campeão</h3><p>{champion}</p></article>
      <article className="section-card">
        <h3>Resultados consolidados</h3>
        <div className="simple-list">
          {tournament.matches.map((match) => (
            <div className="simple-item" key={match.id}>
              <strong>{match.label}</strong>
              <span>{match.homeScore ?? "-"} x {match.awayScore ?? "-"} · {match.winnerPair?.name ?? "Sem vencedor"}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

export function TournamentSettingsTab({ tournament, rankings }: { tournament: NonNullable<TournamentDetails>; rankings: { id: string; name: string }[] }) {
  return (
    <div className="stack-md">
      <article className="section-card">
        <h3>Configurações do torneio</h3>
        <p className="muted">Alterar a estrutura pode desmontar grupos e jogos já montados.</p>
        <TournamentForm
          mode="update"
          tournamentId={tournament.id}
          defaultName={tournament.name}
          defaultDescription={tournament.description}
          defaultPublicSlug={tournament.publicSlug}
          defaultRegistrationPhase={tournament.registrationPhase}
          defaultCreationMode={tournament.creationMode as "MANUAL" | "PUBLIC"}
          defaultGroupCount={tournament.groupCount}
          defaultPairsPerGroup={tournament.pairsPerGroup}
          defaultPriceFirstCents={tournament.priceFirstCents}
          defaultPriceSecondCents={tournament.priceSecondCents}
          defaultPriceThirdCents={tournament.priceThirdCents}
          defaultBlockCategoryGap={tournament.blockCategoryGap}
          defaultMaxCategoryGap={tournament.maxCategoryGap}
          defaultCategoryList={tournament.categories.map((category) => category.name).join(",")}
          defaultRankingId={tournament.rankingId ?? ""}
          rankings={rankings}
          submitLabel="Salvar configurações"
          pendingLabel="Salvando..."
        />
      </article>
    </div>
  );
}


