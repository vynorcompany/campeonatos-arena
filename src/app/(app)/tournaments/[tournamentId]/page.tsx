import { redirect } from "next/navigation";

type LegacyTournamentDetailsPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function LegacyTournamentDetailsPage(props: LegacyTournamentDetailsPageProps) {
  const params = await props.params;
  redirect(`/torneios/${params.tournamentId}`);
}
