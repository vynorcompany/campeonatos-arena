import Link from "next/link";
import { ComandaWhatsappSettings } from "@/components/comandas/whatsapp-settings";
import { PortalPaymentSettings } from "@/components/comandas/portal-payment-settings";
import { FinancialOperationsSettings } from "@/components/comandas/financial-operations-settings";
import { OperationalSubmenuList } from "@/components/operational-submenu-list";
import { requireModuleView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";

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
  const auth = await requireModuleView("finance");
  if (!canPerformPermission("finance:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  return <div className="tw:grid tw:min-w-0 tw:gap-5 tw:[&>section]:scroll-mt-20"><nav aria-label="Seções das configurações financeiras" className="tw:flex tw:flex-wrap tw:gap-2">{[["regras-comandas", "Comandas"], ["pagamentos-portal", "Portal e pagamentos"], ["mensagens-comandas", "WhatsApp"], ["cadastros-financeiros", "Cadastros"]].map(([id, label]) => <Link key={id} href={`#${id}`} className="tw:inline-flex tw:min-h-10 tw:items-center tw:rounded-full tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-4 tw:text-xs tw:font-semibold tw:text-[var(--text)] tw:no-underline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[var(--primary)]">{label}</Link>)}</nav><FinancialOperationsSettings arenaId={auth.arenaId}/><PortalPaymentSettings arenaId={auth.arenaId}/><ComandaWhatsappSettings arenaId={auth.arenaId}/><section id="cadastros-financeiros" tabIndex={-1} aria-label="Cadastros financeiros"><OperationalSubmenuList ariaLabel="Configurações financeiras" items={settings.map(([label, description, slug]) => ({ label, description, href: `/financeiro/configuracoes/${slug}` }))} /></section></div>;
}
