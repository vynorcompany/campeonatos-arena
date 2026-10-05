import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type GamesPageProps = { searchParams?: Promise<{ tournamentId?: string }> };

export default async function GamesPage(props: GamesPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("tournaments");
  const activeTournaments = await prisma.tournament.findMany({
    where: { arenaId: auth.arenaId, registrationPhase: { not: "FINISHED" } },
    orderBy: { updatedAt: "desc" },
    include: { categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, competition: { select: { status: true } } } } }
  });
  const selectedTournament = activeTournaments.find((event) => event.id === searchParams?.tournamentId);

  return <div className={viewStyles.stack_md}>
    <header className={viewStyles.page_header}><Link href="/torneios/novo" className={viewStyles.button_button_primary}>Novo evento</Link></header>
    {selectedTournament ? <SectionCard title={selectedTournament.name} description="Escolha uma categoria para navegar até o espaço operacional."><div className={viewStyles.active_event_back}><Link href="/jogos" className={viewStyles.button}>Voltar aos eventos</Link><Link href={`/torneios/${selectedTournament.id}`} className={viewStyles.button}>Gerenciar evento</Link></div><h3 className={viewStyles.active_event_category_heading}>Escolha uma categoria</h3>{selectedTournament.categories.length ? <div className={viewStyles.active_event_category_list}>{selectedTournament.categories.map((category) => <article className={viewStyles.active_event_category} key={category.id}><div><strong>{category.name}</strong><span>{category.competition?.status === "FINISHED" ? "Concluída" : "Em operação"}</span></div><Link href={`/torneios/${selectedTournament.id}/categorias/${category.id}`} className={viewStyles.button_button_primary}>Abrir categoria</Link></article>)}</div> : <p className={viewStyles.muted}>Este evento ainda não possui categorias ativas.</p>}</SectionCard> : activeTournaments.length ? <section className={viewStyles.active_event_list} aria-label="Eventos em operação">{activeTournaments.map((event) => <article className={viewStyles.active_event_row} key={event.id}><div><strong>{event.name}</strong><span>{event.categories.length} categoria{event.categories.length === 1 ? "" : "s"} ativa{event.categories.length === 1 ? "" : "s"}</span></div><div className={viewStyles.active_event_actions}><Link href={`/jogos?tournamentId=${event.id}`} className={viewStyles.button_button_primary}>Entrar no evento</Link><Link href={`/torneios/${event.id}`} className={viewStyles.button}>Gerenciar evento</Link></div></article>)}</section> : <SectionCard title="Nenhum evento em operação"><p className={viewStyles.muted}>Crie um evento e adicione categorias para começar a registrar jogos.</p><Link href="/torneios/novo" className={viewStyles.button_button_primary}>Criar evento</Link></SectionCard>}
  </div>;
}
