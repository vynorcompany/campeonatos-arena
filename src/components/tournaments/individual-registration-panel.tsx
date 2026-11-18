"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createManualTournamentRegistrationAction, type ActionState } from "@/lib/actions/tournament";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { MoneyInput } from "@/components/forms/money-input";
import { ReceivingBankAccountSelect } from "@/components/finance/bank-account-select";
import { ClientAvatar } from "@/components/players/client-avatar";
import { EventEditorSection } from "./event-editor-section";
import { tournamentWorkspace as ui } from "./tournament-workspace";
export function IndividualRegistrationPanel({ tournamentId, categoryId, registrations, athletes, accounts, defaultAmountCents }: { tournamentId: string; categoryId: string; registrations: { id: string; leadName: string; paymentStatus: string; status: string }[]; athletes: { id: string; name: string }[]; accounts: { id: string; name: string }[]; defaultAmountCents: number }) {
 const [state, action, pending] = useActionState(createManualTournamentRegistrationAction, { error: null, success: null } as ActionState);
 const [paid, setPaid] = useState(false), [amount, setAmount] = useState(defaultAmountCents);
 const router = useRouter();
 useEffect(() => { if (state.success) router.refresh(); }, [state, router]);
 return <div className="tw:grid tw:min-w-0 tw:gap-4"><EventEditorSection title="Inscrição individual"><p className="tw:m-0 tw:text-xs tw:text-[#465c75]">Um atleta por inscrição. Não há configuração de jogos nesta categoria.</p><form action={action} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] tw:items-end tw:gap-3 tw:viewport-760:grid-cols-2 tw:viewport-460:grid-cols-1">
  <input type="hidden" name="registrationType" value="INDIVIDUAL"/><input type="hidden" name="tournamentId" value={tournamentId}/><input type="hidden" name="categoryId" value={categoryId}/>
  <label className={ui.field}>Atleta<SmartEntitySelect createKind="client" label="Atleta" name="leadPlayerId" required><option value="">Pesquisar atleta</option>{athletes.map(athlete => <option value={athlete.id} key={athlete.id}>{athlete.name}</option>)}</SmartEntitySelect></label>
  <label className={ui.field}>Valor da inscrição (R$)<MoneyInput smart name="amountReais" valueCents={amount} onValueCentsChange={setAmount} required/></label>
  <label className={ui.field}>Pagamento<select name="paymentStatus" value={paid ? "PAID" : "PENDING"} onChange={event => setPaid(event.target.value === "PAID")}><option value="PENDING">Pendente</option><option value="PAID">Pago</option></select></label>
  <button type="submit" className={ui.success} disabled={pending}>{pending ? "Salvando..." : "Inscrever atleta"}</button>
  {paid && amount > 0 ? <ReceivingBankAccountSelect accounts={accounts} className={`${ui.field} tw:col-span-full`}/> : null}
  {state.error ? <p role="alert" className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[#a02119]">{state.error}</p> : null}{state.success ? <p role="status" className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[#065f46]">{state.success}</p> : null}
 </form></EventEditorSection><section className={ui.list}><div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_150px_90px]`}><span>Atleta</span><span>Situação</span><span>Ações</span></div>{registrations.length ? registrations.map(reg => <article key={reg.id} className={`${ui.row} tw:py-1.5! tw:gap-y-1! tw:[&_a]:min-h-7! tw:viewport-620:[&_a]:min-h-8! tw:grid-cols-[minmax(0,1fr)_150px_90px] tw:viewport-620:grid-cols-[minmax(0,1fr)_auto]`}><span className="tw:flex tw:min-w-0 tw:items-center tw:gap-2"><span className="tw:[&>span]:size-5"><ClientAvatar name={reg.leadName}/></span><span className="tw:break-words">{reg.leadName}</span></span><span className="tw:text-xs">{reg.status === "CANCELED" || reg.paymentStatus === "REFUNDED" ? "Cancelada" : reg.status === "CONFIRMED" ? "Confirmada" : reg.paymentStatus === "REVIEW" ? "Em análise" : "Pagamento pendente"}</span><Link className={ui.secondary} href={`/torneios/${tournamentId}/inscricoes?q=${encodeURIComponent(reg.leadName)}`}>Gerenciar</Link></article>) : <p className={ui.empty}>Nenhum atleta inscrito.</p>}</section></div>;
}
