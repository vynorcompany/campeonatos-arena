import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import Link from "next/link";
import { arenaDatabase } from "@/lib/arena-database";
import { portalCheckoutPolicy } from "@/lib/payments/portal-checkout-policy";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { FinancialSettingsSwitch } from "./financial-operations-settings";
import { savePortalPaymentSettingsAction } from "@/lib/actions/portal-payment-settings";

export async function PortalPaymentSettings({ arenaId }: { arenaId: string }) {
  const db = arenaDatabase(arenaId);
  const [settings, connection] = await Promise.all([
    db.arenaOperationalSettings.findUnique({ where: { arenaId } }),
    db.paymentConnection.findUnique({ where: { arenaId_provider: { arenaId, provider: "MERCADO_PAGO" } }, select: { status: true } }),
  ]);
  const policy = portalCheckoutPolicy(settings);
  const accounts = await db.bankAccount.findMany({ where: { arenaId, OR: [{ active: true }, ...(settings?.portalPaymentBankAccountId ? [{ id: settings.portalPaymentBankAccountId }] : [])] }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true } });
  return <section id="pagamentos-portal" tabIndex={-1} aria-label="Faturas, consumos e pagamentos" className="tw:grid tw:min-w-0 tw:gap-4 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5"><h2 className="tw:sr-only">Faturas, consumos e pagamentos</h2><p role="status" className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">{connection?.status === "CONNECTED" ? "Mercado Pago conectado" : "Mercado Pago não conectado"}</p>
    <SafeActionForm action={savePortalPaymentSettingsAction} successMessage="Preferências de pagamento do Portal salvas." className="tw:grid tw:gap-4"><div className="tw:grid tw:gap-3 tw:xl:grid-cols-2">
      <FinancialSettingsSwitch name="portalConsumptionEnabled" label="Exibir faturas e consumos no Portal" description="Controla a consulta financeira, comandas e resumo da tela inicial. Os registros da equipe permanecem disponíveis." checked={policy.visible}/>
      <FinancialSettingsSwitch name="portalPaymentEnabled" label="Permitir pagamento pelo Portal" description="Quando desativado, o atleta consulta seus lançamentos e recebe a orientação de pagar na recepção." checked={settings?.portalPaymentsConfigured ? settings.portalPaymentEnabled : true}/>
      <FinancialSettingsSwitch name="portalPixEnabled" label="Aceitar Pix" description="Disponibiliza Pix nos novos links de pagamento do Portal." checked={policy.pix}/>
      <FinancialSettingsSwitch name="portalCreditCardEnabled" label="Aceitar cartão de crédito" description="Disponibiliza cartão de crédito nos novos links. Parcelamento e aprovação seguem as condições do Mercado Pago." checked={policy.creditCard}/>
      <label className="tw:grid tw:content-start tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-4 tw:text-sm tw:font-semibold">Conta para registrar recebimentos<select name="portalPaymentBankAccountId" defaultValue={settings?.portalPaymentBankAccountId ?? ""} className="tw:min-h-11 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-3 tw:text-sm tw:text-[var(--text)]"><option value="">Selecione a conta bancária</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}{account.active ? "" : " (inativa)"}</option>)}</select><small className="tw:text-xs tw:font-normal tw:leading-relaxed tw:text-[var(--muted)]">Classifica os recebimentos nos relatórios financeiros. O provedor recebe pela conta Mercado Pago conectada à arena.</small></label>
      <label className="tw:grid tw:content-start tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-4 tw:text-sm tw:font-semibold">Expiração do link de pagamento<div className="tw:flex tw:items-center tw:gap-3"><input name="checkoutExpiryMinutes" type="number" min="0" max="1440" required defaultValue={policy.expiryMinutes} className="tw:min-h-11 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:px-3 tw:text-[var(--text)]"/><span className="tw:text-xs tw:text-[var(--muted)]">minutos</span></div><small className="tw:text-xs tw:font-normal tw:leading-relaxed tw:text-[var(--muted)]">De 1 a 1.440 minutos. Use 0 para não definir expiração. Vale para novos links; pagamentos já iniciados seguem a confirmação do provedor.</small></label>
    </div><p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">O Checkout Pro pode oferecer saldo da carteira Mercado Pago, além das opções selecionadas. Alterações não cancelam links já emitidos. Um link expirado precisa de conferência da equipe antes de uma nova cobrança para evitar pagamento em duplicidade.</p><SubmitButton label="Salvar pagamentos do Portal" pendingLabel="Salvando..." className={`${ui.primary} tw:justify-self-start`}/></SafeActionForm>
    <div className="tw:grid tw:gap-3 tw:border-t tw:border-[var(--line)] tw:pt-4"><FinancialSettingsSwitch name="autoFiscalNfce" label="Emitir NFC-e automaticamente ao fechar comanda" description="Indisponível enquanto a arena não conectar um emissor fiscal com autorização da SEFAZ. Registros fiscais manuais do sistema não substituem uma NFC-e autorizada." checked={false} disabled/><Link href="/financeiro/configuracoes/notas-fiscais?secao=emissao" className="tw:justify-self-start tw:text-xs tw:underline">Ver configurações fiscais ↗</Link></div>
    <Link href="/financeiro/configuracoes/pagamentos-online" className="tw:justify-self-start tw:text-xs tw:underline">Gerenciar conta de recebimento ↗</Link>
  </section>;
}
