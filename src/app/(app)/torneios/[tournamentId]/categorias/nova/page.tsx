import { viewStyles } from "./page.utilities";
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
  return <main className={viewStyles.tournament_management_page_stack_md}><header className={viewStyles.page_header_tournament_management_header}><div><p className={viewStyles.eyebrow}>Torneio</p><h1>Nova categoria</h1><p className={viewStyles.muted}>{tournament.name}</p></div><Link className={viewStyles.button} href={`/torneios/${tournament.id}`}>Voltar às categorias</Link></header><section className={viewStyles.section_card}><form action={createTournamentCategoryAction} className={viewStyles.grid_form}><input type="hidden" name="tournamentId" value={tournament.id} /><div className={viewStyles.field_form_full}><label htmlFor="category-name">Nome da categoria</label><input id="category-name" name="name" placeholder="Ex.: 5ª Feminina" required autoFocus /></div><button className={viewStyles.button_button_primary} type="submit">Criar e configurar categoria</button></form></section></main>;
}
