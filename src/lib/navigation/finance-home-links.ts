import { canPerformPermission, canViewModule } from "@/lib/permissions";

type FinanceNavigationAccess = {
  arenaRole: string | null;
  systemRole: string;
  viewPermissions: string[];
  editPermissions: string[];
};

export function financeHomeLinks(auth: FinanceNavigationAccess) {
  const canViewFinance = canViewModule("finance", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canViewStock = canViewModule("stock", auth.arenaRole, auth.systemRole, auth.viewPermissions);
  const canManageSettings = canViewFinance && canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);

  return [
    ...(canViewFinance ? [
      { label: "Folha", href: "/financeiro/folha", description: "Calcule salários, horas extras e pagamentos de funcionários." },
      { label: "Contas a Receber", href: "/financeiro/contas-a-receber", description: "Receba aulas, comandas, planos e demais receitas." },
      { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", description: "Gerencie fornecedores, custos e despesas da arena." },
    ] : []),
    ...(canViewStock ? [{ label: "Produtos e Serviços", href: "/pdv", description: "Acesse serviços, estoque e balanços." }] : []),
    ...(canManageSettings ? [{ label: "Configurações Financeiras", href: "/financeiro/configuracoes", description: "Gerencie categorias, pagamentos, bancos e documentos fiscais." }] : []),
  ];
}
