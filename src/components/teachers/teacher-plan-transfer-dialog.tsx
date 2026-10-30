"use client";
import { useCallback, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { previewPlanTransferAction, transferStudentPlanAction } from "@/lib/actions/teacher-plan-billing";

type Quote = Extract<Awaited<ReturnType<typeof previewPlanTransferAction>>, { quote: unknown }>["quote"];
const money = (value: number) => (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => value.split("-").reverse().join("/");
export function TeacherPlanTransferDialog({ teacherId, subscriptionId, currentPlanId, studentName, defaultDueDate, plans }: { teacherId: string; subscriptionId: string; currentPlanId: string; studentName: string; defaultDueDate: string; plans: { id: string; name: string; monthlyPriceCents: number }[] }) {
  const [open, setOpen] = useState(false); const close = useCallback(() => setOpen(false), []);
  const [target, setTarget] = useState(""); const [due, setDue] = useState(defaultDueDate); const [quote, setQuote] = useState<Quote>(); const [error, setError] = useState(""); const [pending, start] = useTransition();
  const hidden = <><input type="hidden" name="teacherId" value={teacherId}/><input type="hidden" name="subscriptionId" value={subscriptionId}/></>;
  return <><button type="button" className={ui.secondary} onClick={() => { setQuote(undefined); setError(""); setOpen(true); }}>Transferir plano</button>
    <Modal open={open} onClose={close} title={`Transferir plano · ${studentName}`} width="tw:max-w-[680px]">
      {quote ? <SafeActionForm action={transferStudentPlanAction} onSuccess={close} successMessage="Plano transferido e diferença registrada." className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-4">
        {hidden}<input type="hidden" name="targetPlanId" value={target}/><input type="hidden" name="newDueDate" value={due}/><input type="hidden" name="quoteToken" value={quote.token}/>
        <div className="tw:min-h-0 tw:flex-1 tw:space-y-4 tw:overflow-y-auto tw:pr-1"><div className="tw:grid tw:min-w-0 tw:gap-3 tw:sm:grid-cols-[1fr_auto_1fr] tw:sm:items-center"><div className={ui.panel}><span className="tw:text-xs tw:text-[var(--muted)]">Plano atual</span><p className="tw:my-2 tw:break-words tw:font-medium">{quote.oldPlanName}</p><span>{money(quote.oldPriceCents)}/mês</span></div><span aria-hidden="true" className="tw:text-center tw:text-xl tw:text-[#1e5ea8]">→</span><div className={ui.panel}><span className="tw:text-xs tw:text-[var(--muted)]">Novo plano</span><p className="tw:my-2 tw:break-words tw:font-medium">{quote.newPlanName}</p><span>{money(quote.newPriceCents)}/mês</span></div></div>
        <dl className="tw:m-0 tw:grid tw:grid-cols-1 tw:sm:grid-cols-[1fr_auto] tw:gap-3 tw:text-sm"><dt>Vencimento atual → novo</dt><dd className="tw:m-0">{date(quote.currentDueDate)} → {date(quote.newDueDate)}</dd><dt>Diferença de plano ({quote.remainingDays}/{quote.cycleDays} dias)</dt><dd className="tw:m-0">{money(quote.planDifferenceCents)}</dd><dt>Ajuste de vencimento</dt><dd className="tw:m-0">{money(quote.dueDateDifferenceCents)}</dd></dl>
        <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">As mensalidades futuras passam ao novo valor. O saldo de aulas e o histórico anterior são preservados.</p>
        {quote.issuedCharges ? <p className="tw:m-0 tw:text-xs tw:text-amber-800">{quote.issuedCharges} cobrança(s) emitida(s) serão canceladas no provedor. As mensalidades passam ao novo valor e vencimento; o histórico anterior permanece registrado.</p> : null}
        {quote.removedGroups.length ? <p role="status" className="tw:m-0 tw:text-xs tw:text-amber-800">Turmas incompatíveis serão encerradas: {quote.removedGroups.join(", ")}. Atribua uma turma compatível após a transferência.</p> : null}
        </div><footer className="tw:mt-auto tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><div className="tw:mr-auto tw:grid tw:basis-full tw:gap-1 tw:text-xs tw:sm:basis-auto"><span>{quote.differenceCents < 0 ? "Crédito para o aluno" : "Diferença a receber"}</span><span className={`tw:text-base tw:font-medium ${quote.differenceCents < 0 ? "tw:text-green-700" : "tw:text-red-700"}`}>{money(Math.abs(quote.differenceCents))}</span></div><button type="button" className={ui.secondary} onClick={() => setQuote(undefined)}>Revisar valores</button><SubmitButton className={ui.primary} label="Confirmar transferência" pendingLabel="Transferindo..."/></footer>
      </SafeActionForm> : <form className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:gap-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setError(""); start(async () => { try { const result = await previewPlanTransferAction(data); if ("error" in result) setError(result.error); else setQuote(result.quote); } catch { setError("Não foi possível calcular a transferência. Tente novamente."); } }); }}>
        {hidden}<label className={ui.field}>Novo plano<select name="targetPlanId" required value={target} onChange={e => setTarget(e.target.value)}><option value="">Selecione</option>{plans.filter(p => p.id !== currentPlanId).map(p => <option key={p.id} value={p.id}>{p.name} · {money(p.monthlyPriceCents)}</option>)}</select></label>
        <label className={ui.field}>Próximo vencimento<input type="date" name="newDueDate" required value={due} onChange={e => setDue(e.target.value)}/></label>
        <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">A diferença considera os dias restantes do ciclo e o novo vencimento. Valores negativos viram crédito para o aluno.</p>
        {error ? <p role="alert" className="tw:text-sm tw:text-red-700">{error}</p> : null}
        <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><button type="submit" className={ui.primary} disabled={pending}>{pending ? "Calculando..." : "Conferir transferência"}</button></footer>
      </form>}
    </Modal></>;
}
