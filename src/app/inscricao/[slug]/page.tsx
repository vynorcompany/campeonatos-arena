import { notFound } from "next/navigation";
import { PublicRegistrationForm } from "@/components/forms/public-registration-form";
import { prisma } from "@/lib/prisma";

export default async function PublicRegistrationPage({ params }: { params: { slug: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { publicSlug: params.slug },
    include: {
      categories: {
        where: { active: true },
        orderBy: { level: "asc" }
      }
    }
  });

  if (!tournament) {
    notFound();
  }

  return (
    <main className="stack-md" style={{ maxWidth: 880, margin: "0 auto", padding: "24px" }}>
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Inscrição Pública</p>
          <h1>{tournament.name}</h1>
          <p className="muted">{tournament.description || "Preencha os dados da dupla para se inscrever no torneio."}</p>
        </div>
      </header>

      <PublicRegistrationForm tournamentSlug={tournament.publicSlug} categories={tournament.categories} />
    </main>
  );
}
