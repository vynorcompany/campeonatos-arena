import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";

const settings = [
  ["Categorias Financeiras", "Padronize receitas e despesas", "categorias-financeiras"],
  ["Categorias de Produtos", "Organize o catálogo, estoque e PDV", "categorias-produtos"],
  ["Conectores de pagamento", "Conecte cobranças online da arena", "pagamentos-online"],
  ["Contas Bancárias", "Cadastre contas e acompanhe saldos", "contas-bancarias"],
  ["Cupons", "Crie descontos e acompanhe a utilização", "cupons"],
  ["Fornecedores", "Mantenha parceiros de compra organizados", "fornecedores"],
  ["Formas de Pagamentos", "Defina os meios aceitos pela arena", "formas-pagamento"],
  ["Notas Fiscais", "Importe NF-e e configure a emissão", "notas-fiscais"]
] as const;

export default async function FinancialSettingsPage() {
  await requireModuleView("finance");
  return <OperationalSubmenuList ariaLabel="Configurações financeiras" items={settings.map(([label, description, slug]) => ({ label, description, href: `/financeiro/configuracoes/${slug}` }))} />;
}
