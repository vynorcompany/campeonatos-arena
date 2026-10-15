"use client";

import { useEffect, useState, useTransition } from "react";
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
const panel = "tw:w-full tw:max-w-[680px] tw:max-h-[calc(100dvh-24px)] tw:overflow-y-auto tw:rounded-2xl tw:border tw:border-[#d8e3f0] tw:bg-white tw:p-5 tw:text-[#102e54] tw:shadow-2xl tw:viewport-620:p-4";
const field = "tw:grid tw:gap-1.5 tw:text-sm tw:font-medium tw:text-[#18365b]";
const input = "tw:min-h-10 tw:w-full tw:rounded-lg tw:border tw:border-[#cbd9ea] tw:bg-white tw:px-3 tw:text-sm tw:text-[#102e54]";
const button = "tw:inline-flex tw:min-h-10 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-[#cbd9ea] tw:bg-white tw:px-3 tw:text-sm tw:font-semibold tw:text-[#174577] tw:disabled:opacity-50";
const primary = "tw:inline-flex tw:min-h-10 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-[#1d5ca7] tw:bg-[#1d5ca7] tw:px-3 tw:text-sm tw:font-semibold tw:text-white tw:disabled:opacity-50";

export function LoyaltySettingsButton({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);
  return <>
    <button type="button" className={button} onClick={() => setOpen(true)}>Configurar fidelidade</button>
    {open ? <div className="tw:fixed tw:inset-0 tw:z-[1000] tw:grid tw:place-items-center tw:bg-[#071b33]/65 tw:p-3" onMouseDown={() => setOpen(false)}>
      <section className={panel} role="dialog" aria-modal="true" aria-label="Configurar fidelidade" onMouseDown={(event) => event.stopPropagation()}>
        <header className="tw:mb-4 tw:flex tw:items-start tw:justify-between tw:gap-3"><div><span className="tw:text-xs tw:font-bold tw:tracking-wider tw:text-[#1d5ca7]">CLIENTES</span><h2 className="tw:m-0 tw:text-xl">Fidelidade da arena</h2></div><button type="button" className={button} onClick={() => setOpen(false)}>Fechar</button></header>
        <p className="tw:mb-4 tw:text-sm tw:text-[#536b86]">Reservas encerradas contam automaticamente. Visitas avulsas são registradas no cadastro do cliente. A recompensa é entregue pela equipe, sem crédito financeiro automático.</p>
        <SafeActionForm action={updateClientLoyaltySettingsAction} onSuccess={() => setOpen(false)} className="tw:grid tw:gap-4" successMessage="Fidelidade atualizada.">
          <label className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:font-semibold"><input name="enabled" type="checkbox" defaultChecked={settings.loyaltyEnabled} /> Programa ativo</label>
          <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2"><label className={field}>Visitas para resgate<input className={input} name="visitsRequired" type="number" min="1" max="1000" defaultValue={settings.loyaltyVisitsRequired} required /></label><label className={field}>Recompensa<input className={input} name="rewardLabel" maxLength={120} defaultValue={settings.loyaltyRewardLabel} required /></label></div>
          <small className="tw:text-[#536b86]">A contagem começa quando o programa é ativado. Reativá-lo inicia um novo ciclo e preserva o histórico anterior.</small>
          <button className={primary} type="submit">Salvar fidelidade</button>
        </SafeActionForm>
      </section>
    </div> : null}
  </>;
}

export function ClientLoyaltyDialog({ playerId, playerName, canEdit, onClose }: { playerId: string; playerName: string; canEdit: boolean; onClose: () => void }) {
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);
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
  return <div className="tw:fixed tw:inset-0 tw:z-[1000] tw:grid tw:place-items-center tw:bg-[#071b33]/65 tw:p-3" onMouseDown={onClose}>
    <section className={panel} role="dialog" aria-modal="true" aria-label={`Fidelidade de ${playerName}`} onMouseDown={(event) => event.stopPropagation()}>
      <header className="tw:mb-4 tw:flex tw:items-start tw:justify-between tw:gap-3"><div><span className="tw:text-xs tw:font-bold tw:tracking-wider tw:text-[#1d5ca7]">CLIENTE · FIDELIDADE</span><h2 className="tw:m-0 tw:text-xl">{playerName}</h2></div><button className={button} type="button" onClick={onClose}>Fechar</button></header>
      {error ? <p role="alert" className="tw:rounded-lg tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800">{error}</p> : null}
      {!state ? <p className="tw:text-sm tw:text-[#536b86]">Carregando fidelidade…</p> : !state.settings.loyaltyEnabled ? <p className="tw:rounded-lg tw:bg-[#f0f5fb] tw:p-3 tw:text-sm">O programa de fidelidade está desativado nesta arena.</p> : <div className="tw:grid tw:gap-4">
        <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:sm:grid-cols-4">{[["Reservas concluídas", state.completedReservations], ["Visitas avulsas", state.manualVisits], ["Visitas disponíveis", state.availableVisits], ["Resgates possíveis", state.availableRewards]].map(([label, value]) => <div key={label} className="tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:bg-[#f7faff] tw:p-3"><small className="tw:block tw:text-xs tw:text-[#536b86]">{label}</small><strong className="tw:text-xl">{value}</strong></div>)}</div>
        <p className="tw:m-0 tw:text-sm tw:text-[#536b86]">{state.settings.loyaltyVisitsRequired} {state.settings.loyaltyVisitsRequired === 1 ? "visita" : "visitas"} por recompensa · <strong>{state.settings.loyaltyRewardLabel}</strong>. Resgates já feitos: {state.redeemedVisits / state.settings.loyaltyVisitsRequired}.</p>
        {canEdit && state.player.active ? <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
          <form className="tw:grid tw:gap-2 tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:p-3" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); data.set("playerId", playerId); run(recordClientVisitAction, data, () => form.reset()); }}><strong className="tw:text-sm">Registrar visita avulsa</strong><input className={input} name="notes" maxLength={200} placeholder="Observação opcional" /><button className={button} disabled={pending} type="submit">Registrar visita</button></form>
          <form className="tw:grid tw:content-between tw:gap-2 tw:rounded-xl tw:border tw:border-[#d8e3f0] tw:p-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(); data.set("playerId", playerId); run(redeemClientLoyaltyAction, data); }}><strong className="tw:text-sm">Resgatar recompensa</strong><small className="tw:text-[#536b86]">O benefício ficará pendente de entrega pela equipe.</small><button className={primary} disabled={pending || !state.availableRewards} type="submit">Registrar resgate</button></form>
        </div> : null}
        <section><h3 className="tw:mb-2 tw:text-base">Histórico recente</h3><div className="tw:grid tw:gap-2">{state.activities.length ? state.activities.map((item) => <article key={item.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:rounded-lg tw:border tw:border-[#d8e3f0] tw:p-3 tw:text-sm"><div><strong>{item.kind === "VISIT" ? "Visita avulsa" : item.rewardLabel}</strong><small className="tw:ml-2 tw:text-[#536b86]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(item.createdAt))}</small>{item.notes ? <p className="tw:m-0 tw:text-[#536b86]">{item.notes}</p> : null}</div>{item.kind === "REWARD" ? item.fulfilledAt ? <span className="tw:text-green-700">Entregue</span> : canEdit ? <button className={button} type="button" disabled={pending} onClick={() => { const data = new FormData(); data.set("activityId", item.id); run(fulfillClientLoyaltyRewardAction, data); }}>Marcar entregue</button> : <span>Pendente</span> : <span className="tw:text-green-700">+1 visita</span>}</article>) : <p className="tw:m-0 tw:text-sm tw:text-[#536b86]">Nenhuma visita avulsa ou recompensa registrada.</p>}</div></section>
      </div>}
    </section>
  </div>;
}
