import { viewStyles } from "./agency-plans-content.utilities";
import Link from "next/link";
import type { AgencyInvoice, AgencyPaymentConnection, AgencyPlan, AgencySubscription, Arena } from "@prisma/client";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { assignAgencyPlanAction, prepareAgencyInvoiceAction, saveAgencyBillingGraceAction, saveAgencyPlanAction, setAgencySubscriptionStatusAction } from "@/lib/actions/agency-subscriptions";
import { formatCurrency } from "@/lib/services/agency";

const date = (value: Date | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(value) : "—";

export type AgencyPlansContentProps = {
  plans: AgencyPlan[];
  arenas: Array<Pick<Arena, "id" | "name" | "accountStatus">>;
  subscriptions: Array<AgencySubscription & { plan: AgencyPlan }>;
  invoices: Array<AgencyInvoice & { arena: { name: string } }>;
  connection: AgencyPaymentConnection | null;
  notice: { connected?: string; connectionError?: string };
};

export function AgencyPlansContent({ plans, arenas, subscriptions, invoices, connection, notice }: AgencyPlansContentProps) {
  const subscriptionByArena = new Map(subscriptions.map((item) => [item.arenaId, item]));

  return <div className={viewStyles.stack_md}>
    <header className={viewStyles.page_header}><div className={viewStyles.stack_xs}><p className={viewStyles.eyebrow}>Agência</p><h1>Planos e assinaturas</h1><p className={viewStyles.muted}>O catálogo e os preços são globais. Alterações valem para todas as arenas na próxima fatura; faturas emitidas mantêm o valor original.</p></div></header>

    <section className={viewStyles.section_card_agency_billing_section}><div className={viewStyles.stack_xs}><h2>Mercado Pago da agência</h2><p className={viewStyles.muted}>Esta conta recebe apenas as assinaturas da plataforma; as conexões financeiras das arenas continuam isoladas.</p></div>{notice.connected ? <p className={viewStyles.form_success}>Mercado Pago da agência conectado com sucesso.</p> : null}{notice.connectionError ? <p className={viewStyles.form_error}>{notice.connectionError}</p> : null}<div className={viewStyles.agency_billing_connect}><strong>{connection?.status === "CONNECTED" ? `Conectado · ${connection.displayName || connection.accountReference}` : "Não conectado"}</strong><Link href="/api/integrations/payments/mercado-pago/agency/connect" className={viewStyles.button_button_primary}>{connection?.status === "CONNECTED" ? "Reconectar" : "Conectar Mercado Pago"}</Link></div></section>

    <section className={viewStyles.section_card_agency_billing_section}><div className={viewStyles.stack_xs}><h2>Prazo para regularização</h2><p className={viewStyles.muted}>Faturas vencidas geram um aviso na arena. Após o prazo, o acesso é suspenso automaticamente até a confirmação do pagamento. A regra começa a valer quando você a ativar e se aplica também a faturas já vencidas.</p></div><SafeActionForm action={saveAgencyBillingGraceAction} successMessage="Prazo de pagamento atualizado." className={viewStyles.agency_grace_form}><label className={viewStyles.field}>Dias após o vencimento<input name="graceDays" type="number" min="0" max="60" defaultValue={connection?.graceDays ?? 7} required /></label><label className={viewStyles.agency_grace_toggle}><input name="enabled" type="checkbox" defaultChecked={connection?.graceDays != null} />Ativar avisos e bloqueio automático</label><SubmitButton label="Salvar prazo" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></SafeActionForm></section>

    <section className={viewStyles.section_card_agency_billing_section}><div className={viewStyles.stack_xs}><h2>Catálogo de planos</h2><p className={viewStyles.muted}>O trial é gratuito por sete dias. Ele não entra no MRR nem emite fatura.</p></div><div className={viewStyles.agency_plan_grid}>{plans.map((plan) => <article className={viewStyles.agency_plan_card} key={plan.id}><strong>{plan.name}</strong><span>{plan.isTrial ? "7 dias gratuitos" : `${formatCurrency(plan.monthlyPriceCents)} / mês`}</span>{!plan.isTrial ? <SafeActionForm action={saveAgencyPlanAction} successMessage="Plano atualizado. O novo preço vale para todas as arenas na próxima fatura." className={viewStyles.agency_plan_edit}><input type="hidden" name="id" value={plan.id} /><label className={viewStyles.field}>Nome<input name="name" defaultValue={plan.name} required /></label><label className={viewStyles.field}>Mensalidade (R$)<input name="monthlyPrice" inputMode="decimal" defaultValue={(plan.monthlyPriceCents / 100).toFixed(2).replace(".", ",")} required /></label><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></SafeActionForm> : null}</article>)}</div><SafeActionForm action={saveAgencyPlanAction} resetOnSuccess successMessage="Plano criado." className={viewStyles.agency_plan_create}><label className={viewStyles.field}>Novo plano<input name="name" placeholder="Nome do plano" required /></label><label className={viewStyles.field}>Mensalidade (R$)<input name="monthlyPrice" inputMode="decimal" placeholder="149,90" required /></label><SubmitButton label="Criar plano" pendingLabel="Criando..." className={viewStyles.button_button_primary} /></SafeActionForm></section>

    <section className={viewStyles.section_card_agency_billing_section}>
      <div className={viewStyles.stack_xs}><h2>Assinaturas por arena</h2><p className={viewStyles.muted}>Ao selecionar um plano pago, a primeira fatura é gerada e aparece no contas a pagar da arena. O ciclo seguinte é mensal.</p></div>
      <div className={viewStyles.agency_subscription_list}>{arenas.map((arena) => {
        const subscription = subscriptionByArena.get(arena.id);
        const trialExpired = Boolean(subscription?.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date());
        return <article key={arena.id} className={viewStyles.agency_subscription_row}>
          <div><strong>{arena.name}</strong><span className={viewStyles.table_subtext}>{arena.accountStatus} · {subscription ? `${subscription.plan.name} · ${trialExpired ? "EXPIRED" : subscription.status}` : "Sem plano"}{subscription?.trialEndsAt ? ` · trial até ${date(subscription.trialEndsAt)}` : ""}</span></div>
          <SafeActionForm action={assignAgencyPlanAction} successMessage="Plano atribuído e financeiro atualizado." className={viewStyles.agency_subscription_form}>
            <input type="hidden" name="arenaId" value={arena.id} />
            <select name="planId" defaultValue={subscription?.planId ?? ""} aria-label={`Plano de ${arena.name}`} required><option value="">Selecionar plano</option>{plans.filter((plan) => plan.isActive && (!plan.isTrial || !subscription || subscription.planId === plan.id)).map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select>
            <SubmitButton label="Aplicar" pendingLabel="..." className={viewStyles.button_button_primary} />
          </SafeActionForm>
          {subscription && !trialExpired && subscription.status !== "EXPIRED" ? <SafeActionForm action={setAgencySubscriptionStatusAction} className={viewStyles.agency_subscription_form} successMessage="Status da assinatura atualizado.">
            <input type="hidden" name="subscriptionId" value={subscription.id} />
            <select name="status" defaultValue={subscription.status} aria-label={`Status da assinatura de ${arena.name}`}><option value="ACTIVE">Ativa</option><option value="PAUSED">Pausada</option><option value="CANCELED">Cancelada</option></select>
            <SubmitButton label="Salvar" pendingLabel="..." className={viewStyles.button} />
          </SafeActionForm> : null}
        </article>;
      })}</div>
    </section>

    <section className={viewStyles.section_card_agency_billing_section}><div className={viewStyles.stack_xs}><h2>Faturas da agência</h2><p className={viewStyles.muted}>Cada fatura está vinculada ao lançamento correspondente no contas a pagar da arena.</p></div><div className={viewStyles.agency_invoice_list}>{invoices.length ? invoices.map((invoice) => <article key={invoice.id} className={viewStyles.agency_invoice_row}><strong>{invoice.arena.name}</strong><span>{invoice.period}</span><span>{formatCurrency(invoice.amountCents)}</span><span>{date(invoice.dueAt)}</span><span>{invoice.status === "PAID" ? "Paga" : "Em aberto"}</span>{invoice.checkoutUrl ? <a href={invoice.checkoutUrl} target="_blank" rel="noopener noreferrer">Abrir cobrança</a> : invoice.status === "PAID" ? <span>Concluída</span> : connection?.status !== "CONNECTED" ? <span>Conecte o Mercado Pago para gerar o link</span> : <SafeActionForm action={prepareAgencyInvoiceAction} successMessage="Link de pagamento gerado."><input type="hidden" name="invoiceId" value={invoice.id} /><SubmitButton label="Gerar link" pendingLabel="..." className={viewStyles.button_button_small} /></SafeActionForm>}</article>) : <p className={viewStyles.muted}>Nenhuma fatura emitida.</p>}</div></section>
  </div>;
}
