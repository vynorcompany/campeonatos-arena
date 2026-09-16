import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentCategoryManagerForm } from "@/components/forms/tournament-category-manager-form";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function localDate(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default async function TournamentCategoriesPage({ params }: { params: { tournamentId: string } }) {
  const auth = await requireModuleView("tournaments");
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, arenaId: auth.arenaId },
    include: { categories: { orderBy: { level: "asc" }, include: { competition: { select: { id: true } } } } },
  });
  if (!tournament) notFound();

  return <main className="tournament-management-page stack-md">
    <header className="page-header tournament-management-header">
      <div><p className="eyebrow">Torneio</p><h1>Gestão de categorias</h1><p className="muted">{tournament.name} · organize preços, vagas, vínculos e disponibilidade de cada categoria.</p></div>
      <Link href={`/torneios/${tournament.id}`} className="button">Voltar ao torneio</Link>
    </header>
    <section className="section-card tournament-category-management-page">
      <TournamentCategoryManagerForm
        tournamentId={tournament.id} defaultName={tournament.name} defaultDescription={tournament.description}
        defaultResponsibleName={tournament.responsibleName} defaultResponsiblePhone={tournament.responsiblePhone}
        defaultStartsAt={localDate(tournament.startsAt)} defaultEndsAt={localDate(tournament.endsAt)}
        defaultRegistrationOpensAt={localDate(tournament.registrationOpensAt)} defaultRegistrationClosesAt={localDate(tournament.registrationClosesAt)}
        defaultEarlyDiscountCents={tournament.earlyDiscountCents} defaultEarlyDiscountUntil={localDate(tournament.earlyDiscountUntil)}
        defaultFirstBonusLimit={tournament.firstBonusLimit} defaultFirstBonusUntil={localDate(tournament.firstBonusUntil)}
        defaultPublicSlug={tournament.publicSlug} defaultRegistrationPhase={tournament.registrationPhase}
        defaultCreationMode={tournament.creationMode as "MANUAL" | "PUBLIC"} defaultShowInEventRadar={tournament.showInEventRadar}
        defaultGroupCount={tournament.groupCount} defaultPairsPerGroup={tournament.pairsPerGroup}
        defaultPriceFirstCents={tournament.priceFirstCents} defaultPriceSecondCents={tournament.priceSecondCents} defaultPriceThirdCents={tournament.priceThirdCents}
        defaultBlockCategoryGap={tournament.blockCategoryGap} defaultMaxCategoryGap={tournament.maxCategoryGap} defaultRankingId={tournament.rankingId ?? ""}
        defaultCategories={tournament.categories.map((category) => ({ name: category.name, groupCount: category.groupCount, pairsPerGroup: category.pairsPerGroup, priceFirstCents: category.priceFirstCents, priceSecondCents: category.priceSecondCents, priceThirdCents: category.priceThirdCents, standardKey: category.standardKey, maxRegistrations: category.maxRegistrations, active: category.active, hasCompetition: Boolean(category.competition), allowedRegistrationStandardKeys: category.allowedRegistrationCategoryIds.map((id) => tournament.categories.find((item) => item.id === id)?.standardKey).filter((key): key is string => Boolean(key)) }))}
      />
    </section>
  </main>;
}
