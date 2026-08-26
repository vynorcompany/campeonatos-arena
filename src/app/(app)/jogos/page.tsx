import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type GamesPageProps = { searchParams?: { tournamentId?: string } };

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const auth = await requireModuleView("tournaments");
  const activeTournaments = await prisma.tournament.findMany({
    where: { arenaId: auth.arenaId, registrationPhase: { not: "FINISHED" } },
    orderBy: { updatedAt: "desc" },
    include: { categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, competition: { select: { status: true } } } } }
  });
  const selectedTournament = activeTournaments.find((event) => event.id === searchParams?.tournamentId);

  return <div className="stack-md">
    <header className="page-header"><div className="stack-xs"><p className="eyebrow">Torneios</p><h1>Eventos ativos</h1><p className="muted">Entre no evento para escolher a categoria que deseja operar.</p></div><Link href="/torneios/novo" className="button button-primary">Novo evento</Link></header>
    {selectedTournament ? <SectionCard title={selectedTournament.name} description="Escolha uma categoria para navegar até o espaço operacional."><div className="active-event-back"><Link href="/jogos" className="button">Voltar aos eventos</Link><Link href={`/torneios/${selectedTournament.id}`} className="button">Gerenciar evento</Link></div><h3 className="active-event-category-heading">Escolha uma categoria</h3>{selectedTournament.categories.length ? <div className="active-event-category-list">{selectedTournament.categories.map((category) => <article className="active-event-category" key={category.id}><div><strong>{category.name}</strong><span>{category.competition?.status === "FINISHED" ? "Concluída" : "Em operação"}</span></div><Link href={`/torneios/${selectedTournament.id}/categorias/${category.id}`} className="button button-primary">Abrir categoria</Link></article>)}</div> : <p className="muted">Este evento ainda não possui categorias ativas.</p>}</SectionCard> : activeTournaments.length ? <section className="active-event-list" aria-label="Eventos em operação">{activeTournaments.map((event) => <article className="active-event-row" key={event.id}><div><strong>{event.name}</strong><span>{event.categories.length} categoria{event.categories.length === 1 ? "" : "s"} ativa{event.categories.length === 1 ? "" : "s"}</span></div><div className="active-event-actions"><Link href={`/jogos?tournamentId=${event.id}`} className="button button-primary">Entrar no evento</Link><Link href={`/torneios/${event.id}`} className="button">Gerenciar evento</Link></div></article>)}</section> : <SectionCard title="Nenhum evento em operação"><p className="muted">Crie um evento e adicione categorias para começar a registrar jogos.</p><Link href="/torneios/novo" className="button button-primary">Criar evento</Link></SectionCard>}
  </div>;
}
