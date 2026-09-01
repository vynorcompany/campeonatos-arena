import AgendaConfiguracaoPage from "@/app/(app)/agenda/configuracao/page";

type CourtConfigurationWorkspaceProps = {
  courtId?: string;
};

export function CourtConfigurationWorkspace({ courtId }: CourtConfigurationWorkspaceProps) {
  return <AgendaConfiguracaoPage searchParams={{ court: courtId }} />;
}
