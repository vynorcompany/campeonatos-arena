import { getClientDirectory } from "@/lib/clients/directory";
import { viewStyles } from "./page.utilities";
import { AthleteCreatePanel } from "@/components/players/athlete-create-panel";
import { ClientManagementWorkspace } from "@/components/players/client-management-workspace";
import { LoyaltySettingsButton } from "@/components/players/client-loyalty";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";

type PlayersPageProps = { searchParams?: Promise<{ player?: string; q?: string; phone?: string; financial?: string; planId?: string; active?: string; teacherId?: string }> };

export default async function PlayersPage(props: PlayersPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("players");
  const { clients, plans, teachers, loyaltySettings, guardians, mergeClients } = await getClientDirectory(auth.arenaId, { q: searchParams?.q, phone: searchParams?.phone, financial: searchParams?.financial, planId: searchParams?.planId, active: searchParams?.active, teacherId: searchParams?.teacherId });

  const canEditLoyalty = canEditModule("players", auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <div className={viewStyles.client_management_page}><header className={viewStyles.client_management_header}><nav className={viewStyles.page_breadcrumb} aria-label="Caminho de navegação"><span>Arena</span><i aria-hidden="true">›</i><strong>Clientes</strong></nav><div className="tw:flex tw:flex-wrap tw:gap-2">{canEditLoyalty ? <LoyaltySettingsButton iconOnly settings={loyaltySettings} /> : null}<AthleteCreatePanel iconOnly openLabel="Novo cliente" guardians={guardians} /></div></header><ClientManagementWorkspace initialClientId={searchParams?.player} clients={clients} mergeClients={mergeClients} plans={plans} teachers={teachers} canEditLoyalty={canEditLoyalty} filters={{ q: searchParams?.q ?? "", phone: searchParams?.phone ?? "", financial: searchParams?.financial ?? "ALL", planId: searchParams?.planId ?? "", active: searchParams?.active ?? "ALL", teacherId: searchParams?.teacherId ?? "" }} /></div>;
}
