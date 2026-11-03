"use client";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateFixedCourtPlanOptionsAction } from "@/lib/actions/fixed-court-plans";
import { PlanDueOptions } from "./plan-due-options";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function FixedPlanOptions({planId,dueDays,prorate}:{planId:string;dueDays:number[];prorate:boolean}) {
 const [open,setOpen]=useState(false),close=useCallback(()=>setOpen(false),[]);
 return <><button type="button" className={ui.secondary} onClick={()=>setOpen(true)}>Configurar plano</button><Modal title="Configurar plano" open={open} onClose={close} width="tw:max-w-[640px]">{open?<SafeActionForm action={updateFixedCourtPlanOptionsAction} onSuccess={close} successMessage="Configuração salva para novos vínculos." className="tw:grid tw:gap-3"><input type="hidden" name="planId" value={planId}/><PlanDueOptions defaults={dueDays}/><label className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="prorateFifthWeek" type="checkbox" defaultChecked={prorate}/>Proporcional em meses com cinco reservas (base de quatro)</label><p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">Aplicado aos próximos vínculos. Mensalidades já geradas são preservadas.</p><footer className="tw:flex tw:justify-end tw:gap-2"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Salvar" pendingLabel="Salvando…" className={ui.primary}/></footer></SafeActionForm>:null}</Modal></>;
}
