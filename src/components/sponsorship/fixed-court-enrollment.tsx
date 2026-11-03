"use client";
import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { enrollFixedCourtPlanAction } from "@/lib/actions/fixed-court-plans";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
export function FixedCourtEnrollment({ planId, clients, dueDay }: {
    planId: string;
    clients: {
        id: string;
        name: string;
    }[];
    dueDay: number;
}) {
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);
    return <><button className={ui.primary} type="button" onClick={() => setOpen(true)}>Vincular cliente</button><Modal title="Vincular ao plano fixo" open={open} onClose={close} width="tw:max-w-[620px]">{open ? <SafeActionForm action={enrollFixedCourtPlanAction} onSuccess={close} successMessage="Horários reservados e mensalidades geradas." className="tw:grid tw:min-w-0 tw:gap-4 tw:sm:grid-cols-2"><input type="hidden" name="planId" value={planId}/><label className={`${ui.field} tw:sm:col-span-2`}>Cliente<select name="playerId" required><option value="">Selecione</option>{clients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className={ui.field}>Início<input name="startsAt" type="date" required/></label><label className={ui.field}>Fim<input name="endsAt" type="date" required/></label><p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)] tw:sm:col-span-2">Mensalidades com vencimento no dia {dueDay}, a partir do primeiro vencimento após o início. Os horários semanais estão incluídos na mensalidade.</p><footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:sm:col-span-2"><button type="button" onClick={close} className={ui.secondary}>Cancelar</button><SubmitButton label="Vincular e reservar" pendingLabel="Reservando…" className={ui.primary}/></footer></SafeActionForm> : null}</Modal></>;
}
