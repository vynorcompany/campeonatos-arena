import { PublicTrioMatches } from "@/components/tournaments/public-trio-matches";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicRegistrationForm } from "@/components/forms/public-registration-form";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";

type PublicTournamentTab = "inscricao" | "inscritos" | "chaveamento" | "jogos";

const publicTabs: Array<{ id: PublicTournamentTab; label: string }> = [
  { id: "inscricao", label: "Inscrição" },
  { id: "inscritos", label: "Inscritos" },
  { id: "chaveamento", label: "Chaveamento" },
  { id: "jogos", label: "Jogos" },
];

function pairName(registration: { leadName: string; partnerName: string; thirdName?: string } | null) {
  return registration ? [registration.leadName, registration.partnerName, registration.thirdName].filter(Boolean).join(" / ") : "A definir";
}

export default async function PublicRegistrationPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const requestedTab = publicTabs.some((tab) => tab.id === searchParams?.tab)
    ? searchParams?.tab as PublicTournamentTab
    : "inscricao";
  const [tournamentOwner] = await prisma.$queryRaw<{ id: string; arenaId: string }[]>`SELECT * FROM public.resolve_tournament_public_slug(${params.slug})`;
  if (!tournamentOwner) notFound();
  const tournament = await arenaDatabase(tournamentOwner.arenaId).tournament.findUnique({
    where: { publicSlug: params.slug, arenaId: tournamentOwner.arenaId },
    include: {
      arena: { select: { name: true, logoUrl: true, slug: true } },
      categories: { where: { active: true, archivedAt: null }, orderBy: { level: "asc" }, include: { competition: { select: { format: true, status: true, isPublic: true, pairs: { where: { active: true, competition: { format: "TRIO", isPublic: true, status: { in: ["PUBLISHED", "FINISHED"] } } }, orderBy: { drawOrder: "asc" }, select: { id: true, name: true, players: { orderBy: { slot: "asc" }, select: { player: { select: { id: true, name: true } } } } } }, matches: { where: { competition: { format: "TRIO", isPublic: true, status: { in: ["PUBLISHED", "FINISHED"] } } }, orderBy: { roundOrder: "asc" }, select: { id: true, label: true, stage: true, scheduledTime: true, courtName: true, homeScore: true, awayScore: true, homePair: { select: { name: true, players: { select: { player: { select: { id: true, name: true } } } } } }, awayPair: { select: { name: true, players: { select: { player: { select: { id: true, name: true } } } } } }, trioGames: { orderBy: { gameNumber: "asc" }, select: { gameNumber: true, homePlayerIds: true, awayPlayerIds: true, homeScore: true, awayScore: true } } } } } } } },
      publicRegistrations: {
        where: { status: "CONFIRMED" },
        orderBy: [{ registrationOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, leadName: true, partnerName: true, thirdName: true, categoryId: true },
      },
      categoryBrackets: {
        where: { category: { archivedAt: null } },
        include: {
          category: { select: { name: true } },
          matches: {
            orderBy: [{ roundOrder: "asc" }, { label: "asc" }],
            include: {
              homeRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
              awayRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
              winnerRegistration: { select: { leadName: true, partnerName: true, thirdName: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();
  const availablePublicTabs = tournament.categories.some(category => category.registrationType !== "INDIVIDUAL") ? publicTabs : publicTabs.filter(tab => tab.id === "inscricao" || tab.id === "inscritos");
  const activeTab = availablePublicTabs.some(tab => tab.id === requestedTab) ? requestedTab : "inscricao";
  const publicTrios = tournament.categories.filter(category => category.competition?.format === "TRIO" && category.competition.isPublic && ["PUBLISHED", "FINISHED"].includes(category.competition.status));

  return (
    <main className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Inscrição pública</p>
          <h1>{tournament.name}</h1>
          <p className={viewStyles.muted}>{tournament.description || "Acompanhe o torneio e faça sua inscrição."}</p>
        </div>
      </header>
      <nav className={viewStyles.public_tournament_tabs} aria-label="Navegação do torneio">
        {availablePublicTabs.map((tab) => <Link aria-current={activeTab === tab.id ? "page" : undefined} className={cx(activeTab === tab.id ? "is-active" : "")} href={`/inscricao/${tournament.publicSlug}${tab.id === "inscricao" ? "" : `?tab=${tab.id}`}`} key={tab.id}>{tab.label}</Link>)}
      </nav>

      {activeTab === "inscricao" ? <PublicRegistrationForm tournamentSlug={tournament.publicSlug} categories={tournament.categories.filter(category => category.competition?.format !== "TRIO" || category.competition.status === "DRAFT").map(category => ({ id: category.id, name: category.name, registrationType: category.registrationType, competition: category.competition ? { format: category.competition.format } : null }))} arenaSlug={tournament.arena.slug} arenaName={tournament.arena.name} arenaLogoUrl={tournament.arena.logoUrl} responsibleName={tournament.responsibleName} responsiblePhone={tournament.responsiblePhone} /> : null}

      {activeTab === "inscritos" ? <section className={viewStyles.section_card_public_tournament_content}><header><h2>Inscritos</h2><p className={viewStyles.muted}>Equipes com inscrição confirmada.</p></header>{tournament.categories.map((category) => { const registrations = tournament.publicRegistrations.filter((registration) => registration.categoryId === category.id); const trio = publicTrios.find(item => item.id === category.id)?.competition; return <article className={viewStyles.public_tournament_group} key={category.id}><h3>{category.name}</h3>{trio ? (trio.pairs.length ? <ul>{trio.pairs.map(pair => <li key={pair.id}>{pair.players.map(({player}) => player.name).join(" / ") || pair.name}</li>)}</ul> : <p className={viewStyles.muted}>Nenhum trio confirmado nesta categoria.</p>) : registrations.length ? <ul>{registrations.map((registration) => <li key={registration.id}>{pairName(registration)}</li>)}</ul> : <p className={viewStyles.muted}>Nenhuma equipe confirmada nesta categoria.</p>}</article>; })}</section> : null}

      {activeTab === "chaveamento" ? <section className={viewStyles.section_card_public_tournament_content}><header><h2>Chaveamento</h2><p className={viewStyles.muted}>Acompanhe as chaves publicadas pela organização.</p></header>{publicTrios.map(category => <PublicTrioMatches key={category.id} categoryName={category.name} matches={category.competition!.matches} knockoutOnly />)}{tournament.categoryBrackets.length ? tournament.categoryBrackets.map((bracket) => <article className={viewStyles.public_tournament_group} key={bracket.id}><h3>{bracket.category.name}</h3>{bracket.matches.length ? <ul>{bracket.matches.map((match) => <li key={match.id}><strong>{match.label}</strong><span>{pairName(match.homeRegistration)} × {pairName(match.awayRegistration)}{match.winnerRegistration ? ` · Vencedora: ${pairName(match.winnerRegistration)}` : ""}</span></li>)}</ul> : <p className={viewStyles.muted}>Chave ainda não montada.</p>}</article>) : publicTrios.length ? null : <p className={viewStyles.muted}>O chaveamento será publicado após o encerramento das inscrições.</p>}</section> : null}

      {activeTab === "jogos" ? <section className={viewStyles.section_card_public_tournament_content}><header><h2>Jogos</h2><p className={viewStyles.muted}>Calendário e resultados por categoria.</p></header>{publicTrios.map(category => <PublicTrioMatches key={category.id} categoryName={category.name} matches={category.competition!.matches} knockoutOnly={false} />)}{tournament.categoryBrackets.length ? tournament.categoryBrackets.map((bracket) => <article className={viewStyles.public_tournament_group} key={bracket.id}><h3>{bracket.category.name}</h3>{bracket.matches.length ? <ul>{bracket.matches.map((match) => <li key={match.id}><strong>{match.label}</strong><span>{match.scheduledTime || "Horário a definir"}{match.courtName ? ` · ${match.courtName}` : ""} · {pairName(match.homeRegistration)} × {pairName(match.awayRegistration)}</span></li>)}</ul> : <p className={viewStyles.muted}>Nenhum jogo publicado.</p>}</article>) : publicTrios.length ? null : <p className={viewStyles.muted}>Os jogos aparecerão aqui quando a organização publicar as chaves.</p>}</section> : null}
    </main>
  );
}
