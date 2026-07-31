import Link from "next/link";
import { RankingCreateForm } from "@/components/forms/ranking-create-form";
import { requireModuleView } from "@/lib/auth/guards";

export default async function NewRankingPage() {
  await requireModuleView("tournaments");

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>Novo ranking</h1>
          <p className="muted">Defina a identificação e o formato inicial. As regras de pontuação ficam no ranking criado.</p>
        </div>
        <Link href="/torneios/rankings" className="button">Voltar aos rankings</Link>
      </header>

      <RankingCreateForm />
    </div>
  );
}
