import { viewStyles } from "./tournament-detail-layout.utilities";
import { TournamentTabs, type TournamentTabKey } from "@/components/tournaments/tournament-tabs";

export function TournamentDetailLayout({
  tournamentId,
  categoryId,
  activeTab,
  availableTabs,
  counts,
  children
}: {
  tournamentId: string;
  categoryId: string;
  activeTab: TournamentTabKey;
  availableTabs?: readonly TournamentTabKey[];
  counts?: Partial<Record<TournamentTabKey, string | number>>;
  children: React.ReactNode;
}) {
  return (
    <div className={viewStyles.stack_md_category_detail_layout}>
      <TournamentTabs
        tournamentId={tournamentId}
        categoryId={categoryId}
        activeTab={activeTab}
        counts={counts}
        availableTabs={availableTabs}
      />
      {children}
    </div>
  );
}

