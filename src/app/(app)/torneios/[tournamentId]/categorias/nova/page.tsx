import Link from "next/link";
import { createTournamentCategoryAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function NewTournamentCategoryPage(props: { params: Promise<{ tournamentId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  const tournament = await prisma.tournament.findFirst({ where: { id: params.tournamentId, arenaId: auth.arenaId }, select: { id: true, name: true } });
  if (!tournament) notFound();
  return <main className="tournament-management-page stack-md"><header className="page-header tournament-management-header"><div><p className="eyebrow">Torneio</p><h1>Nova categoria</h1><p className="muted">{tournament.name}</p></div><Link className="button" href={`/torneios/${tournament.id}`}>Voltar às categorias</Link></header><section className="section-card"><form action={createTournamentCategoryAction} className="grid-form"><input type="hidden" name="tournamentId" value={tournament.id} /><div className="field form-full"><label htmlFor="category-name">Nome da categoria</label><input id="category-name" name="name" placeholder="Ex.: 5ª Feminina" required autoFocus /></div><button className="button button-primary" type="submit">Criar e configurar categoria</button></form></section></main>;
}
