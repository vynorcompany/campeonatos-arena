"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateFixedCourtPlanOptionsAction } from "@/lib/actions/fixed-court-plans";
import { PlanDueOptions } from "./plan-due-options";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function FixedPlanOptions({planId,dueDays,prorate,reservationCredits}:{planId:string;dueDays:number[];prorate:boolean;reservationCredits:number}) {
 const [open,setOpen]=useState(false),close=useCallback(()=>setOpen(false),[]);
 return <><button type="button" className={ui.secondary} onClick={()=>setOpen(true)}>Configurar plano</button><Modal title="Configurar plano" open={open} onClose={close} width="tw:max-w-[640px]">{open?<SafeActionForm action={updateFixedCourtPlanOptionsAction} onSuccess={close} successMessage="Configuração salva para novos vínculos." className="tw:flex tw:h-full tw:min-h-0 tw:flex-col tw:gap-3"><div className="tw:grid tw:min-h-0 tw:flex-1 tw:content-start tw:gap-3 tw:overflow-y-auto"><input type="hidden" name="planId" value={planId}/><PlanDueOptions defaults={dueDays}/><label className={ui.field}>Créditos de reserva por ciclo<input type="number" name="reservationCredits" min="1" max="99" defaultValue={reservationCredits || 4} required/></label><label className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="prorateFifthWeek" type="checkbox" defaultChecked={prorate}/>Ajustar valor e créditos em meses com cinco semanas (base de quatro semanas)</label><p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">Aplicado aos próximos vínculos. Mensalidades já geradas são preservadas.</p></div><footer className="tw:shrink-0 tw:flex tw:justify-end tw:gap-2"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar" pendingLabel="Salvando…" className={ui.primary}/></footer></SafeActionForm>:null}</Modal></>;
}
