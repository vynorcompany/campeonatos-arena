import { canPerformPermission, canViewModule } from "@/lib/permissions";

type FinanceNavigationAccess = {
  arenaRole: string | null;
  systemRole: string;
  viewPermissions: string[];
  editPermissions: string[];
};

export function financeHomeLinks(auth: FinanceNavigationAccess) {
  const canViewFinance = canViewModule("finance", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canViewReceivable = canPerformPermission("finance:receivable:view", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canViewPayable = canPerformPermission("finance:payable:view", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canViewStock = canViewModule("stock", auth.arenaRole, auth.systemRole, auth.viewPermissions);

  return [
    ...(canViewPayable ? [{ label: "Folha", href: "/financeiro/folha", description: "Calcule salários, horas extras e pagamentos de funcionários." }] : []),
    ...(canViewReceivable ? [{ label: "Contas a Receber", href: "/financeiro/contas-a-receber", description: "Receba aulas, comandas, planos e demais receitas." }] : []),
    ...(canViewPayable ? [{ label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", description: "Gerencie fornecedores, custos e despesas da arena." }] : []),
    ...(canViewStock ? [{ label: "Produtos e Serviços", href: "/pdv", description: "Acesse serviços, estoque e balanços." }] : []),
  ];
}
