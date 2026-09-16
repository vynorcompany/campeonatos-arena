import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateCategoryMatchScheduleAction } from "@/lib/actions/category-competition";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function TournamentGamesPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const auth = await requireModuleView("tournaments");
  const { tournamentId } = await params;
  const [tournament, courts, matches] = await Promise.all([
    prisma.tournament.findFirst({ where: { id: tournamentId, arenaId: auth.arenaId }, select: { id: true, name: true } }),
    prisma.court.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.categoryMatch.findMany({ where: { competition: { category: { tournamentId } } }, include: { competition: { select: { category: { select: { name: true } } } }, homePair: { select: { name: true } }, awayPair: { select: { name: true } } }, orderBy: { roundOrder: "asc" } })
  ]);
  if (!tournament) notFound();
  return <div className="stack-md workspace-page tournament-games-page">
    <header className="page-header"><div><p className="eyebrow">TORNEIO</p><h1>Jogos · {tournament.name}</h1><p className="muted">Distribua os jogos de todas as categorias por data, horário e quadra.</p></div><Link className="button" href={`/torneios/${tournament.id}`}>Voltar ao torneio</Link></header>
    <section className="section-card tournament-games-list"><header><div><h2>Programação geral</h2><p>{matches.length} jogo{matches.length === 1 ? "" : "s"} gerado{matches.length === 1 ? "" : "s"}.</p></div></header>{matches.length ? matches.map((match) => <article key={match.id}><div className="tournament-games-identification"><span>{match.competition.category.name} · {match.label}</span><strong>{match.homePair?.name ?? "A definir"} <b>×</b> {match.awayPair?.name ?? "A definir"}</strong></div><SafeActionForm action={updateCategoryMatchScheduleAction} className="tournament-game-schedule" successMessage="Jogo programado."><input type="hidden" name="matchId" value={match.id} /><label>Data<input name="scheduledDate" type="date" defaultValue={match.scheduledDate ?? ""} required /></label><label>Horário<input name="scheduledTime" type="time" defaultValue={match.scheduledTime ?? ""} required /></label><label>Quadra<select name="courtName" defaultValue={match.courtName ?? ""} required><option value="" disabled>Selecione</option>{courts.map((court) => <option key={court.name} value={court.name}>{court.name}</option>)}</select></label><SubmitButton className="button button-primary" label="Salvar" pendingLabel="Salvando..." /></SafeActionForm></article>) : <p className="muted">Gere as chaves das categorias para programar os jogos aqui.</p>}</section>
  </div>;
}
