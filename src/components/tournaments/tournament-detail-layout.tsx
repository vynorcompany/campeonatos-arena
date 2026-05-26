import { TournamentTabs, type TournamentTabKey } from "@/components/tournaments/tournament-tabs";

export function TournamentDetailLayout({
  tournamentId,
  activeTab,
  children
}: {
  tournamentId: string;
  activeTab: TournamentTabKey;
  children: React.ReactNode;
}) {
  return (
    <div className="stack-md">
      <TournamentTabs tournamentId={tournamentId} activeTab={activeTab} />
      {children}
    </div>
  );
}

