import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { TournamentWizard } from "@/components/tournaments/tournament-wizard";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function NewTournamentPage() {
  const auth = await requireModuleView("tournaments");
  const rankings = await prisma.rankingProfile.findMany({
    where: {
      arenaId: auth.arenaId,
      type: "INDIVIDUAL"
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Torneios</p>
          <h1>Novo torneio</h1>
          <p className="muted">Crie via inscricoes publicas ou no modo antigo da arena (sem inscricoes) para montar duplas manualmente.</p>
        </div>
        <Link href="/torneios" className="button">Voltar</Link>
      </header>

      <SectionCard title="Assistente de criação" description="Escolha o modo, preencha as etapas e revise antes de criar.">
        <TournamentWizard rankings={rankings} />
      </SectionCard>
    </div>
  );
}


