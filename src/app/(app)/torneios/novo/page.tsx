import Link from "next/link";
import { TournamentForm } from "@/components/forms/tournament-form";
import { SectionCard } from "@/components/section-card";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function NewTournamentPage() {
  const auth = await requireModuleView("tournaments");
  const rankings = await prisma.rankingProfile.findMany({
    where: {
      arenaId: auth.arenaId,
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Torneios</p>
          <h1>Novo evento</h1>
          <p className="muted">
            Cadastre os dados gerais agora. Categorias, formatos e rankings são
            configurados dentro do evento.
          </p>
        </div>
        <Link href="/torneios" className="button">
          Voltar
        </Link>
      </header>

      <SectionCard
        title="Dados do evento"
        description="A criação não define formato, grupos ou ranking."
      >
        <TournamentForm rankings={rankings} />
      </SectionCard>
    </div>
  );
}
