import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";

const areas = [
  ["Folha", "/financeiro/folha", "Calcule salários, horas extras e pagamentos de funcionários."],
  ["Contas a Receber", "/financeiro/contas-a-receber", "Receba aulas, comandas, planos e demais receitas."],
  ["Contas a Pagar", "/financeiro/contas-a-pagar", "Gerencie fornecedores, custos e despesas da arena."],
] as const;

export default async function FinancePage() {
  await requireModuleView("finance");
  return <OperationalSubmenuList ariaLabel="Áreas financeiras" items={areas.map(([label, href, description]) => ({ label, href, description }))} />;
}
