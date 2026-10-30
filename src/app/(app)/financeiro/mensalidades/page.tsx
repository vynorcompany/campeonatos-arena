import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { ReceivingBankAccountSelect } from "@/components/finance/bank-account-select";
import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createSubscriptionAction, recordPlanPaymentAction } from "@/lib/actions/finance";
import { requireFinanceView } from "@/lib/auth/guards";
import { canPerformPermission } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";

function getReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function renewalDate(startedAt: Date) {
  return new Date(startedAt.getFullYear() + 1, startedAt.getMonth(), startedAt.getDate());
}

export default async function MonthlyPaymentsPage() {
  const auth = await requireFinanceView("receivable");
  const canCreate = canPerformPermission("finance:receivable:create", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canSettle = canPerformPermission("finance:receivable:settle", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const [students, plans, subscriptions, bankAccounts] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.student.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    tx.plan.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" }
    }),
    tx.studentSubscription.findMany({
      where: { arenaId: auth.arenaId, status: "ACTIVE" },
      include: { student: true, plan: true },
      orderBy: { dueDay: "asc" }
    }),
    tx.bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]));
  const today = new Date();
  const renewalLimit = new Date(today); renewalLimit.setDate(renewalLimit.getDate() + 30);
  const renewals = subscriptions.map((subscription) => ({ ...subscription, renewAt: renewalDate(subscription.startedAt) })).filter((subscription) => subscription.renewAt <= renewalLimit).sort((left, right) => left.renewAt.getTime() - right.renewAt.getTime());

  return (
    <div className={viewStyles.stack_md}>

      {canCreate || canSettle ? <div className={viewStyles.two_column_grid}>
        {canCreate ? <SectionCard title="Ativar ou renovar plano" description="Cria um ciclo de 12 mensalidades. A renovação fica disponível após completar 12 meses; as cobranças anteriores são preservadas." className="tw:content-start" hideHeading>
          <SafeActionForm action={createSubscriptionAction} className={viewStyles.grid_form_finance_narrow_form} resetOnSuccess successMessage="Plano ativado ou renovado. Novo ciclo de 12 mensalidades criado.">
            <div className={viewStyles.field}>
              <label htmlFor="subscription-student">Aluno</label>
              <select id="subscription-student" name="studentId" required defaultValue="">
                <option value="">Selecione o aluno</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="subscription-plan">Plano</label>
              <select id="subscription-plan" name="planId" required defaultValue="">
                <option value="">Selecione o plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatMoney(plan.monthlyPriceCents)}
                  </option>
                ))}
              </select>
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="subscription-due-day">Dia de vencimento</label>
              <input id="subscription-due-day" name="dueDay" type="number" min="1" max="28" defaultValue="10" />
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="subscription-started-at">Início</label>
              <input id="subscription-started-at" name="startedAt" type="date" />
            </div>
            <div className={viewStyles.field_form_full}>
              <label htmlFor="subscription-notes">Observações</label>
              <input id="subscription-notes" name="notes" type="text" />
            </div>
            <div className={viewStyles.field_field_submit}>
              <SubmitButton label="Ativar ou renovar" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
            </div>
          </SafeActionForm>
        </SectionCard> : null}

        {canSettle ? <SectionCard title="Registrar pagamento" description="O pagamento entra como receita no financeiro." hideHeading>
          <SafeActionForm action={recordPlanPaymentAction} className="grid-form tw:grid tw:grid-cols-1 tw:gap-3 tw:[align-content:start]" resetOnSuccess successMessage="Pagamento registrado.">
            <div className={viewStyles.field_form_full}>
              <label htmlFor="payment-subscription">Assinatura</label>
              <select id="payment-subscription" name="subscriptionId" required defaultValue="">
                <option value="">Selecione a assinatura</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.student.name} - {subscription.plan.name} - {formatMoney(subscription.monthlyPriceCents)}
                  </option>
                ))}
              </select>
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="payment-reference">Mês de referência</label>
              <input id="payment-reference" name="referenceMonth" type="month" defaultValue={getReferenceMonth()} required />
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="payment-amount">Valor pago (opcional)</label>
              <input id="payment-amount" name="amount" type="text" placeholder="Valor do plano" />
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="payment-method">Forma de pagamento</label>
              <select id="payment-method" name="paymentMethod" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
                <option value="DEBIT_CARD">Cartão de débito</option>
                <option value="CASH">Dinheiro</option>
                <option value="TRANSFER">Transferência</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <ReceivingBankAccountSelect accounts={bankAccounts} className={viewStyles.field} />
            <div className={viewStyles.field}>
              <label htmlFor="payment-paid-at">Data do pagamento</label>
              <input id="payment-paid-at" name="paidAt" type="date" />
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="payment-fiscal-document">Documento fiscal</label>
              <select id="payment-fiscal-document" name="fiscalDocumentType" defaultValue="">
                <option value="">Não emitir agora</option>
                <option value="NFS_E">Emitir nota de serviço</option>
                <option value="NFC_E">Emitir cupom fiscal</option>
              </select>
            </div>
            <div className={viewStyles.field_field_submit}>
              <SubmitButton label="Registrar pagamento" pendingLabel="Registrando..." className={viewStyles.button_button_primary} />
            </div>
          </SafeActionForm>
        </SectionCard> : null}
      </div> : null}

      <SectionCard title="Renovações de planos" description="Acompanhe os alunos cujo ciclo de 12 mensalidades está terminando. A renovação é sempre manual, evitando novas cobranças sem aprovação." hideHeading>
        {renewals.length ? <div className={viewStyles.simple_list_settings_compact_list}>{renewals.map((subscription) => <div className={viewStyles.simple_item} key={subscription.id}><strong>{subscription.student.name} · {subscription.plan.name}</strong><span>Renovação em {new Intl.DateTimeFormat("pt-BR").format(subscription.renewAt)} · {subscription.renewAt < today ? "renovação disponível" : "renovação próxima"}</span><small>A partir dessa data, use “Ativar ou renovar” para criar as próximas 12 mensalidades sem cancelar as anteriores.</small></div>)}</div> : <p className={viewStyles.muted}>Nenhuma renovação necessária nos próximos 30 dias.</p>}
      </SectionCard>

      <SectionCard title="Assinaturas ativas" description="Alunos com planos ativos." hideHeading>
        <div className={ui.list}>
          <div className={`${ui.head} tw:max-[1200px]:hidden tw:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_100px_100px_110px]`}><span>Aluno</span><span>Plano</span><span>Valor</span><span>Vencimento</span><span>Aulas</span><span>Ciclo</span></div>
          {subscriptions.map(subscription => <article key={subscription.id} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_100px_100px_110px] tw:max-[1200px]:grid-cols-2`}>
            <strong>{subscription.student.name}</strong><span>{subscription.plan.name}</span><strong className="tw:tabular-nums">{formatMoney(subscription.monthlyPriceCents)}</strong><span><small className="tw:hidden tw:max-[1200px]:block">Vencimento</small>Dia {subscription.dueDay}</span><span>{subscription.classesPerMonth} aulas por mês</span><span><small className="tw:hidden tw:max-[1200px]:block">Renovação</small>{new Intl.DateTimeFormat("pt-BR").format(renewalDate(subscription.startedAt))}</span>
          </article>)}
          {!subscriptions.length ? <p className={ui.empty}>Nenhuma assinatura ativa.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
