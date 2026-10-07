import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";
export default async function ProductsAndServicesPage() {
  await requireModuleView("stock");
  return <OperationalSubmenuList ariaLabel="Produtos e Serviços" items={[
    { label: "Serviços", href: "/pdv/servicos", description: "Configure os valores por atleta de Liga e Super 12." },
    { label: "Estoque", href: "/pdv/estoque", description: "Cadastre produtos, revise preços e acompanhe o estoque." },
    { label: "Criar balanço", href: "/pdv/balanco", description: "Registre a contagem física e confira as divergências." }
  ]} />;
}
