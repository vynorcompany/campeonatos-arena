import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicRegistrationForm } from "@/components/forms/public-registration-form";
import { prisma } from "@/lib/prisma";

type PublicTournamentTab = "inscricao" | "inscritos" | "chaveamento" | "jogos";

const publicTabs: Array<{ id: PublicTournamentTab; label: string }> = [
  { id: "inscricao", label: "Inscrição" },
  { id: "inscritos", label: "Inscritos" },
  { id: "chaveamento", label: "Chaveamento" },
  { id: "jogos", label: "Jogos" },
];

function pairName(registration: { leadName: string; partnerName: string } | null) {
  return registration ? `${registration.leadName} / ${registration.partnerName}` : "A definir";
}

export default async function PublicRegistrationPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { tab?: string };
}) {
  const activeTab = publicTabs.some((tab) => tab.id === searchParams?.tab)
    ? searchParams?.tab as PublicTournamentTab
    : "inscricao";
  const tournament = await prisma.tournament.findUnique({
    where: { publicSlug: params.slug },
    include: {
      arena: { select: { name: true, logoUrl: true } },
      categories: { where: { active: true }, orderBy: { level: "asc" } },
      publicRegistrations: {
        where: { status: "CONFIRMED" },
        orderBy: { registrationOrder: "asc" },
        select: { id: true, leadName: true, partnerName: true, categoryId: true },
      },
      categoryBrackets: {
        include: {
          category: { select: { name: true } },
          matches: {
            orderBy: [{ roundOrder: "asc" }, { label: "asc" }],
            include: {
              homeRegistration: { select: { leadName: true, partnerName: true } },
              awayRegistration: { select: { leadName: true, partnerName: true } },
              winnerRegistration: { select: { leadName: true, partnerName: true } },
            },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  return (
    <main className="stack-md" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px" }}>
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Inscrição pública</p>
          <h1>{tournament.name}</h1>
          <p className="muted">{tournament.description || "Acompanhe o torneio e inscreva sua dupla."}</p>
        </div>
      </header>
      <nav className="public-tournament-tabs" aria-label="Navegação do torneio">
        {publicTabs.map((tab) => <Link className={activeTab === tab.id ? "is-active" : ""} href={`/inscricao/${tournament.publicSlug}${tab.id === "inscricao" ? "" : `?tab=${tab.id}`}`} key={tab.id}>{tab.label}</Link>)}
      </nav>

      {activeTab === "inscricao" ? <PublicRegistrationForm tournamentSlug={tournament.publicSlug} categories={tournament.categories} arenaName={tournament.arena.name} arenaLogoUrl={tournament.arena.logoUrl} responsibleName={tournament.responsibleName} responsiblePhone={tournament.responsiblePhone} /> : null}

      {activeTab === "inscritos" ? <section className="section-card public-tournament-content"><header><h2>Inscritos</h2><p className="muted">Duplas com inscrição confirmada.</p></header>{tournament.categories.map((category) => { const registrations = tournament.publicRegistrations.filter((registration) => registration.categoryId === category.id); return <article className="public-tournament-group" key={category.id}><h3>{category.name}</h3>{registrations.length ? <ul>{registrations.map((registration) => <li key={registration.id}>{pairName(registration)}</li>)}</ul> : <p className="muted">Nenhuma dupla confirmada nesta categoria.</p>}</article>; })}</section> : null}

      {activeTab === "chaveamento" ? <section className="section-card public-tournament-content"><header><h2>Chaveamento</h2><p className="muted">Acompanhe as chaves publicadas pela organização.</p></header>{tournament.categoryBrackets.length ? tournament.categoryBrackets.map((bracket) => <article className="public-tournament-group" key={bracket.id}><h3>{bracket.category.name}</h3>{bracket.matches.length ? <ul>{bracket.matches.map((match) => <li key={match.id}><strong>{match.label}</strong><span>{pairName(match.homeRegistration)} × {pairName(match.awayRegistration)}{match.winnerRegistration ? ` · Vencedora: ${pairName(match.winnerRegistration)}` : ""}</span></li>)}</ul> : <p className="muted">Chave ainda não montada.</p>}</article>) : <p className="muted">O chaveamento será publicado após o encerramento das inscrições.</p>}</section> : null}

      {activeTab === "jogos" ? <section className="section-card public-tournament-content"><header><h2>Jogos</h2><p className="muted">Calendário e resultados por categoria.</p></header>{tournament.categoryBrackets.length ? tournament.categoryBrackets.map((bracket) => <article className="public-tournament-group" key={bracket.id}><h3>{bracket.category.name}</h3>{bracket.matches.length ? <ul>{bracket.matches.map((match) => <li key={match.id}><strong>{match.label}</strong><span>{match.scheduledTime || "Horário a definir"}{match.courtName ? ` · ${match.courtName}` : ""} · {pairName(match.homeRegistration)} × {pairName(match.awayRegistration)}</span></li>)}</ul> : <p className="muted">Nenhum jogo publicado.</p>}</article>) : <p className="muted">Os jogos aparecerão aqui quando a organização publicar as chaves.</p>}</section> : null}
    </main>
  );
}
