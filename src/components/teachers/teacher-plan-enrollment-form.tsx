"use client";
import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { createQuickPlayerAction } from "@/lib/actions/calendar";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { Modal } from "@/components/ui/modal";

import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./teacher-plan-enrollment-form.utilities";

import { useCallback, useMemo, useState, useTransition } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventIcon } from "@/components/tournaments/event-icon";
import { assignTeacherPlanStudentAction } from "@/lib/actions/academy";

type Client = { id: string; name: string; phone: string };
type Plan = { id: string; name: string };
type Group = { id: string; name: string; planIds: string[] };

export function TeacherPlanEnrollmentForm({
  teacherId,
  plans,
  clients,
  groups = [],
  variant = "default",
  bankAccounts = [],
  paymentMethods = ["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Boleto"],
  canRegisterPayment = false,
}: {
  teacherId: string;
  plans: Plan[];
  clients: Client[];
  groups?: Group[];
  variant?: "default" | "students";
  bankAccounts?: { id: string; name: string }[];
  paymentMethods?: string[];
  canRegisterPayment?: boolean;
}) {
  const [paid, setPaid] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [quickPending, startQuickTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [groupId, setGroupId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const close = useCallback(() => { setPaid(false); setModalOpen(false); }, []);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const matches = useMemo(
    () =>
      query.trim()
        ? clients
            .filter((client) =>
              client.name
                .toLocaleLowerCase("pt-BR")
                .includes(query.toLocaleLowerCase("pt-BR")),
            )
            .slice(0, 8)
        : [],
    [clients, query],
  );
  const availableGroups = groups.filter((group) =>
    group.planIds.includes(planId),
  );
  const form = (
    <SafeActionForm
      action={assignTeacherPlanStudentAction}
      className={cx(`${viewStyles.teacher_enrollment_form} ${variant === "students" ? viewStyles.teacher_enrollment_students : ""}`)}
      resetOnSuccess
      successMessage="Aluno inserido e mensalidade recorrente criada."
      validate={() => {
        if (!clientId) return "Selecione um cliente na lista de pesquisa.";
        if (variant === "students" && !groupId) return "Selecione a turma de destino para inserir o aluno.";
        return null;
      }}
      onSuccess={() => {
        setPaid(false);
        setClientId("");
        setQuery("");
        setGroupId("");
        setClientPickerOpen(false);
        setModalOpen(false);
      }}
    >
      <input type="hidden" name="teacherId" value={teacherId} />
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className={viewStyles.teacher_enrollment_primary}>
        {plans.length > 1 || variant === "students" ? (
          <label>
            Plano
            <select
              value={planId}
              onChange={(event) => {
                setPlanId(event.currentTarget.value);
                setGroupId("");
              }}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {variant === "students" ? (
          <label>
            Turma de destino
            <select
              name="classGroupId"
              value={groupId}
              onChange={(event) => setGroupId(event.currentTarget.value)}
            >
              <option value="" disabled>
                Selecione a turma
              </option>
              {availableGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={viewStyles.teacher_client_search}>
          Pesquisar cliente
          <input
            value={query}
            onFocus={() => setClientPickerOpen(true)}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setClientId("");
              setClientPickerOpen(true);
            }}
            aria-label="Pesquisar cliente"
            placeholder="Digite o nome do cliente"
            autoComplete="off"
            required
          />
          {clientPickerOpen && matches.length ? (
            <div className={viewStyles.teacher_client_options}>
              {matches.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setClientId(client.id);
                    setQuery(client.name);
                    setClientPickerOpen(false);
                  }}
                >
                  <strong>{client.name}</strong>
                  <span>{client.phone || "Sem telefone"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </label>
        {!clientId && query.trim() ? <button type="button" className={ui.secondary} onClick={() => setQuickOpen(true)}>Cadastrar cliente</button> : null}
      </div>
      <div className={viewStyles.teacher_enrollment_financial}>
        <label>
          Data de início
          <input type="date" name="startedAt" required />
        </label>
        <label>
          Vencimento
          <input type="date" name="dueDate" required />
        </label>
        <label>
          Desconto
          <input name="discount" inputMode="decimal" defaultValue="0" />
        </label>
        <label>
          Tipo
          <select name="discountMode" defaultValue="AMOUNT">
            <option value="AMOUNT">R$</option>
            <option value="PERCENTAGE">%</option>
          </select>
        </label>
        <label>
          Aplicação
          <select name="discountApplication" defaultValue="ONE_TIME">
            <option value="ONE_TIME">Só primeira mensalidade</option>
            <option value="RECURRING">Recorrente</option>
          </select>
        </label>
      </div>
      {canRegisterPayment ? <section className="tw:col-span-full tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-3 tw:sm:grid-cols-2"><div className="tw:col-span-full"><input type="hidden" name="paid" value={paid ? "on" : ""} /><ToggleSwitch compact label="Mensalidade paga" checked={paid} onCheckedChange={setPaid} /></div>{paid ? <><label className={ui.field}>Data do pagamento<input name="paidAt" type="date" required defaultValue={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())} /></label><label className={ui.field}>Forma de pagamento<select name="paymentMethod" required>{paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}</select></label><label className={`${ui.field} tw:sm:col-span-2`}>Conta bancária<select name="bankAccountId" required defaultValue=""><option value="">Selecione a conta</option>{bankAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></> : null}<small className="tw:col-span-full tw:text-xs tw:font-normal tw:text-[var(--muted)]">Créditos liberados após a quitação da mensalidade do mês.</small></section> : <p className="tw:col-span-full tw:text-xs tw:font-normal tw:text-[var(--muted)]">Créditos liberados após a quitação da mensalidade do mês.</p>}
      <SubmitButton
        label="Inserir aluno"
        pendingLabel="Inserindo..."
        className={viewStyles.button_button_primary}
      />
      {variant === "students" && !availableGroups.length ? <p className={viewStyles.form_full}>Não há turma ativa compatível com este plano. Cadastre ou vincule uma turma antes de inserir o aluno.</p> : null}
    </SafeActionForm>
  );
  const quickDialog = <Modal title="Cadastrar cliente" open={quickOpen} onClose={() => setQuickOpen(false)} width="tw:max-w-[520px]"><form className="tw:grid tw:gap-3 tw:sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setQuickError(""); startQuickTransition(async () => { try { const result = await createQuickPlayerAction(data); if(result.error || !result.id) { setQuickError(result.error ?? "Não foi possível cadastrar."); return; } setClientId(result.id); setQuery(result.name ?? query); setClientPickerOpen(false); setQuickOpen(false); } catch { setQuickError("Não foi possível cadastrar. Confira sua permissão para criar clientes."); } }); }}><label className={`${ui.field} tw:sm:col-span-2`}>Nome<input name="name" defaultValue={query} required /></label><label className={ui.field}>Telefone<input name="phone" type="tel" required /></label><label className={ui.field}>E-mail<input name="email" type="email" /></label><label className={ui.field}>CPF<input name="cpf" inputMode="numeric" /></label><label className={ui.field}>Nascimento<input name="birthDate" type="date" /></label><input type="hidden" name="class" value="" /><input type="hidden" name="gender" value="" />{quickError ? <p role="alert" className="tw:col-span-full tw:text-sm tw:text-red-700">{quickError}</p> : null}<footer className="tw:col-span-full tw:flex tw:justify-end tw:gap-2"><button type="button" className={ui.secondary} onClick={() => setQuickOpen(false)}>Cancelar</button><button disabled={quickPending} className={ui.primary}>{quickPending ? "Salvando..." : "Cadastrar"}</button></footer></form></Modal>;
  if (variant !== "students") return <>{form}{quickDialog}</>;
  return (
    <>
      <button
        type="button"
        className={viewStyles.button_button_primary_button_small_teacher_insert_student_trigger}
        onClick={() => setModalOpen(true)}
      >
        <EventIcon name="user-plus" size={15} /> Inserir aluno
      </button>
      <Modal title="Inserir aluno" width="tw:max-w-[760px]" open={modalOpen} onClose={close}>
        {form}
      </Modal>
      {quickDialog}
    </>
  );
}
