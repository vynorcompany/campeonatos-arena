"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { receiveOnsiteTournamentRegistrationAction, type ActionState } from "@/lib/actions/tournament";
import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";

export function ReceiveOnsiteRegistrationButton({ registrationId, accounts }: { registrationId: string; accounts: { id: string; name: string }[] }) {
 const [open, setOpen] = useState(false);
 const [state, action, pending] = useActionState(receiveOnsiteTournamentRegistrationAction, {error:null,success:null} as ActionState);
 const router = useRouter();
 useEffect(()=>{if(state.success){setOpen(false);router.refresh();}},[state,router]);
 const now = new Date();
 const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 return <><button type="button" className={ui.success} onClick={()=>setOpen(true)}>Receber</button><Modal open={open} onClose={()=>{if(!pending)setOpen(false);}} title="Receber inscrição" fixedSize={false} width="tw:max-w-[440px]" tone="management-strong"><form action={action} onSubmit={event=>event.stopPropagation()} className="tw:grid tw:min-w-0 tw:gap-4"><input type="hidden" name="registrationId" value={registrationId}/><label className={ui.field}>Conta bancária<SmartEntitySelect label="Conta bancária" name="bankAccountId" required><option value="">Selecione a conta bancária</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</SmartEntitySelect>{!accounts.length ? <small>Cadastre uma conta bancária nas configurações financeiras.</small> : null}</label><label className={ui.field}>Data do recebimento<input type="date" name="paidAt" defaultValue={today} required/></label>{state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-[#a02119]">{state.error}</p> : null}<footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[#c7d8eb] tw:pt-3"><button type="button" className={ui.secondary} disabled={pending} onClick={()=>setOpen(false)}>Cancelar</button><button type="submit" className={ui.success} disabled={pending}>{pending ? "Recebendo..." : "Confirmar recebimento"}</button></footer></form></Modal></>;
}
