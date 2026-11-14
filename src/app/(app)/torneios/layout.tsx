import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { TournamentSectionNav } from "@/components/tournaments/tournament-section-nav";
export default async function TournamentsLayout({children}:{children:React.ReactNode}) {
 const auth=await requireArenaAccess();
 const canView=canViewModule("tournaments",auth.arenaRole,auth.systemRole,auth.viewPermissions);
 const canReadMatches=canViewModule("matches",auth.arenaRole,auth.systemRole,auth.viewPermissions);
 const canManage=canView&&canPerformPermission("tournaments:manage",auth.arenaRole,auth.systemRole,auth.editPermissions);
 return <div className="tw:grid tw:w-full tw:min-w-0 tw:max-w-none! tw:gap-3 tw:[&>_*]:min-w-0 tw:[&>_*]:max-w-none!">{canView||canReadMatches?<TournamentSectionNav canManage={canManage} canViewTournaments={canView}/>:null}{children}</div>;
}
