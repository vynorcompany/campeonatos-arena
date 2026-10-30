import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { OperationalSubmenuList } from "@/components/operational-submenu-list";

export default async function SettingsPage() {
  const auth = await requireArenaAccess();
  const canView = (module: Parameters<typeof canViewModule>[0]) => canViewModule(module, auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canManage = (permission: string) => canPerformPermission(permission, auth.arenaRole, auth.systemRole, auth.editPermissions);
  const items = [
    { href: "/configuracoes/dispositivos", label: "Dispositivos conectados", description: "Confira e encerre as sessões da sua conta." },
    ...(canManage("arena:settings") ? [{ href: "/configuracoes/impressora", label: "Impressora", description: "Configure papel e vias; teste a impressão pelo driver instalado." }, { href: "/configuracoes/politicas", label: "Cancelamento e reembolso", description: "Publique os prazos e condições específicos da sua arena." }, { href: "/configuracoes/privacidade", label: "Solicitações de privacidade", description: "Atenda pedidos de acesso, correção e exclusão de dados." }] : []),
    ...(canView("arena") ? [{ href: "/arena", label: "Dados da Arena", description: "Identidade, contatos e dados da empresa." }, { href: "/arena?section=portal", label: "Portal do Atleta", description: "Áreas, identidade visual e conteúdo do Portal." }] : []),
    ...(canView("finance") && canManage("finance:settings:manage") ? [{ href: "/financeiro/configuracoes", label: "Configurações Financeiras", description: "Regras de comandas, pagamentos, categorias e emissão fiscal." }] : []),
    ...(canView("calendar") && canManage("calendar:settings:manage") ? [{ href: "/configuracoes/checkin", label: "Check-in e QR Code", description: "Ative, baixe ou renove o QR de reservas e aulas." }, { href: "/agenda/configuracao", label: "Quadras e horários", description: "Faixas, valores, quadras e disponibilidade online." }] : []),
  ];
  return <section className="tw:grid tw:min-w-0 tw:gap-5"><WorkspaceHeading title="Configurações" /><OperationalSubmenuList ariaLabel="Configurações" items={items} /></section>;
}
