import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";

const areas = [
  ["Planos", "/financeiro/planos", "Cadastre pacotes e mensalidades."],
  ["Mensalidades", "/financeiro/mensalidades", "Vincule alunos a planos e registre pagamentos."],
  ["Folha", "/financeiro/folha", "Calcule salários, horas extras e pagamentos de funcionários."],
  ["Contas a Receber", "/financeiro/contas-a-receber", "Receba aulas, comandas, planos e demais receitas."],
  ["Contas a Pagar", "/financeiro/contas-a-pagar", "Gerencie fornecedores, custos e despesas da arena."],
  ["PDV/estoque", "/financeiro/pdv-estoque", "Veja vendas, estoque e movimentações."]
] as const;

export default async function FinancePage() {
  await requireModuleView("finance");
  return <OperationalSubmenuList ariaLabel="Áreas financeiras" items={areas.map(([label, href, description]) => ({ label, href, description }))} />;
}
