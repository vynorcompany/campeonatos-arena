import { redirect } from "next/navigation";

type LegacyTournamentDetailsPageProps = {
  params: {
    tournamentId: string;
  };
};

export default function LegacyTournamentDetailsPage({ params }: LegacyTournamentDetailsPageProps) {
  redirect(`/torneios/${params.tournamentId}`);
}
