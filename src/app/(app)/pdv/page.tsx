import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";
export default async function ProductsAndServicesPage() {
  const auth = await requireModuleView("stock");
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  return <OperationalSubmenuList ariaLabel="Produtos e Serviços" items={[
    { label: "Serviços", href: "/pdv/servicos", description: canEdit ? "Configure os valores por atleta de Liga e Super 12." : "Consulte os valores por atleta de Liga e Super 12." },
    { label: "Estoque", href: "/pdv/estoque", description: canEdit ? "Cadastre produtos, revise preços e acompanhe o estoque." : "Consulte produtos, preços e movimentações do estoque." },
    ...(canEdit ? [{ label: "Criar balanço", href: "/pdv/balanco", description: "Registre a contagem física e confira as divergências." }] : [])
  ]} />;
}
