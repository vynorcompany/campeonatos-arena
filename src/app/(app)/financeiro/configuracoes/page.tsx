import Link from "next/link";
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
  return <nav className="settings-submenu-list" aria-label="Configurações financeiras">{settings.map(([label, description, slug]) => <Link href={`/financeiro/configuracoes/${slug}`} key={slug}><span className="settings-submenu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V9m7 10V5m7 14v-7" /></svg></span><span><strong>{label}</strong><small>{description}</small></span><svg className="settings-submenu-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></Link>)}</nav>;
}
