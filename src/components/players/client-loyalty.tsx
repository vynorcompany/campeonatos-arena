"use client";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";


import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import {
  fulfillClientLoyaltyRewardAction,
  getClientLoyaltyAction,
  recordClientVisitAction,
  redeemClientLoyaltyAction,
  updateClientLoyaltySettingsAction,
} from "@/lib/actions/client-loyalty";

type LoyaltyState = Awaited<ReturnType<typeof getClientLoyaltyAction>>;
type Settings = { loyaltyEnabled: boolean; loyaltyVisitsRequired: number; loyaltyRewardLabel: string; loyaltyStartedAt: string | null };
const field = "tw:grid tw:gap-1.5 tw:text-sm tw:font-medium tw:text-[#18365b]";
const input = "tw:min-h-10 tw:w-full tw:rounded-lg tw:border tw:border-[#cbd9ea] tw:bg-white tw:px-3 tw:text-sm tw:text-[#102e54]";
const button = ui.secondary;
const primary = ui.primary;

export function LoyaltySettingsButton({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);
  const closeSettings = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={button} onClick={() => setOpen(true)}>Configurar fidelidade</button>
    <Modal title="Configurar fidelidade" open={open} onClose={closeSettings} width="tw:max-w-[680px]">
        <p className="tw:mb-4 tw:text-sm tw:text-[#536b86]">Reservas encerradas contam automaticamente. Visitas avulsas são registradas no cadastro do cliente. A recompensa é entregue pela equipe, sem crédito financeiro automático.</p>
        <SafeActionForm action={updateClientLoyaltySettingsAction} onSuccess={() => setOpen(false)} className="tw:grid tw:gap-4" successMessage="Fidelidade atualizada.">
          <label className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:font-semibold"><input name="enabled" type="checkbox" defaultChecked={settings.loyaltyEnabled} /> Programa ativo</label>
          <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2"><label className={field}>Visitas para resgate<input className={input} name="visitsRequired" type="number" min="1" max="1000" defaultValue={settings.loyaltyVisitsRequired} required /></label><label className={field}>Recompensa<input className={input} name="rewardLabel" maxLength={120} defaultValue={settings.loyaltyRewardLabel} required /></label></div>
          <small className="tw:text-[#536b86]">A contagem começa quando o programa é ativado. Reativá-lo inicia um novo ciclo e preserva o histórico anterior.</small>
          <button className={primary} type="submit">Salvar fidelidade</button>
        </SafeActionForm>
    </Modal>
  </>;
}

export function ClientLoyaltyDialog({ playerId, playerName, canEdit, onClose }: { playerId: string; playerName: string; canEdit: boolean; onClose: () => void }) {
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const closeDialog = useCallback(() => closeRef.current(), []);
  useEffect(() => {
    let active = true;
    getClientLoyaltyAction(playerId).then((result) => { if (active) setState(result); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar a fidelidade."); });
    return () => { active = false; };
  }, [playerId]);
  const run = (action: (form: FormData) => Promise<unknown>, form: FormData, reset?: () => void) => {
    setError("");
    startTransition(async () => {
      try { await action(form); reset?.(); setState(await getClientLoyaltyAction(playerId)); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a fidelidade."); }
    });
  };
  return <Modal title={`Fidelidade de ${playerName}`} open onClose={closeDialog} width="tw:max-w-[680px]">
      {error ? <p role="alert" className="tw:rounded-lg tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800">{error}</p> : null}
      {!state ? <p className="tw:text-sm tw:text-[#536b86]">Carregando fidelidade…</p> : !state.settings.loyaltyEnabled ? <p className="tw:rounded-lg tw:border tw:border-[var(--line)] tw:bg-white tw:p-3 tw:text-sm">O programa de fidelidade está desativado nesta arena.</p> : <div className="tw:grid tw:gap-4">
        <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:sm:grid-cols-4">{[["Reservas concluídas", state.completedReservations], ["Visitas avulsas", state.manualVisits], ["Visitas disponíveis", state.availableVisits], ["Resgates possíveis", state.availableRewards]].map(([label, value]) => <div key={label} className="tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:bg-white tw:p-3"><small className="tw:block tw:text-xs tw:text-[#536b86]">{label}</small><strong className="tw:text-xl">{value}</strong></div>)}</div>
        <p className="tw:m-0 tw:text-sm tw:text-[#536b86]">{state.settings.loyaltyVisitsRequired} {state.settings.loyaltyVisitsRequired === 1 ? "visita" : "visitas"} por recompensa · <strong>{state.settings.loyaltyRewardLabel}</strong>. Resgates já feitos: {state.redeemedVisits / state.settings.loyaltyVisitsRequired}.</p>
        {canEdit && state.player.active ? <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
          <form className="tw:grid tw:gap-2 tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:p-3" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); data.set("playerId", playerId); run(recordClientVisitAction, data, () => form.reset()); }}><strong className="tw:text-sm">Registrar visita avulsa</strong><input className={input} name="notes" maxLength={200} placeholder="Observação opcional" /><button className={button} disabled={pending} type="submit">Registrar visita</button></form>
          <form className="tw:grid tw:content-between tw:gap-2 tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:p-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(); data.set("playerId", playerId); run(redeemClientLoyaltyAction, data); }}><strong className="tw:text-sm">Resgatar recompensa</strong><small className="tw:text-[#536b86]">O benefício ficará pendente de entrega pela equipe.</small><button className={primary} disabled={pending || !state.availableRewards} type="submit">Registrar resgate</button></form>
        </div> : null}
        <section><h3 className="tw:mb-2 tw:text-base">Histórico recente</h3><div className="tw:grid tw:gap-2">{state.activities.length ? state.activities.map((item) => <article key={item.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:rounded-lg tw:border tw:border-[#d8e3f0] tw:p-3 tw:text-sm"><div><strong>{item.kind === "VISIT" ? "Visita avulsa" : item.rewardLabel}</strong><small className="tw:ml-2 tw:text-[#536b86]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.createdAt))}</small>{item.notes ? <p className="tw:m-0 tw:text-[#536b86]">{item.notes}</p> : null}</div>{item.kind === "REWARD" ? item.fulfilledAt ? <span className="tw:text-green-700">Entregue</span> : canEdit ? <button className={button} type="button" disabled={pending} onClick={() => { const data = new FormData(); data.set("activityId", item.id); run(fulfillClientLoyaltyRewardAction, data); }}>Marcar entregue</button> : <span>Pendente</span> : <span className="tw:text-green-700">+1 visita</span>}</article>) : <p className="tw:m-0 tw:text-sm tw:text-[#536b86]">Nenhuma visita avulsa ou recompensa registrada.</p>}</div></section>
      </div>}
  </Modal>;
}
