"use client";

import { usePathname } from "next/navigation";

export function PageBreadcrumb({ section, current }: { section: string; current: string }) {
  return <nav className="page-breadcrumb workspace-page-breadcrumb" aria-label="Caminho de navegação"><span>{section}</span><i aria-hidden="true">›</i><strong>{current}</strong></nav>;
}

const financeNames: Record<string, string> = {
  "": "Financeiro",
  "contas-a-receber": "Contas a Receber",
  "contas-a-pagar": "Contas a Pagar",
  "lancamentos": "Lançamentos",
  "mensalidades": "Mensalidades",
  "planos": "Planos de aulas",
  "folha": "Folha de pagamento",
  "pdv-estoque": "Estoque",
  "configuracoes": "Configurações financeiras",
};

function readable(value: string) {
  return value.replaceAll("-", " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

export function WorkspaceBreadcrumb() {
  const path = usePathname() ?? "";
  const parts = path.split("/").filter(Boolean);
  if (path.startsWith("/proximos-jogos/patrocinios")) return <PageBreadcrumb section="Gestão" current="Gestão de patrocínios" />;
  if (path.startsWith("/proximos-jogos")) return <PageBreadcrumb section="Painéis" current="Tela da TV" />;
  if (path.startsWith("/torneios/rankings")) return <PageBreadcrumb section="Torneios" current="Rankings" />;
  if (path.startsWith("/jogos")) return <PageBreadcrumb section="Torneios" current="Eventos ativos" />;
  if (path.startsWith("/financeiro")) return <PageBreadcrumb section="Gestão" current={financeNames[parts[1] ?? ""] ?? readable(parts.at(-1) ?? "Financeiro")} />;
  if (path.startsWith("/pdv")) return <PageBreadcrumb section="Financeiro" current={readable(parts.at(-1) ?? "Produtos e serviços")} />;
  if (path.startsWith("/relatorios")) return <PageBreadcrumb section="Gestão" current={parts[1] ? readable(parts[1]) : "Relatórios"} />;
  return null;
}
