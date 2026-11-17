"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { removeTournamentCategoryAction } from "@/lib/actions/tournament";
import { tournamentWorkspace as ui } from "./tournament-workspace";

export function RemoveCategoryButton({ tournamentId, categoryId, categoryName, registrationCount, onRemoved }: { tournamentId: string; categoryId: string; categoryName: string; registrationCount: number; onRemoved?: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState(removeTournamentCategoryAction, { error: null, success: null });
  const handledSuccess = useRef(false);
  useEffect(() => { if (state.success && !handledSuccess.current) { handledSuccess.current = true; setOpen(false); onRemoved?.(); router.refresh(); } }, [state, router, onRemoved]);
  return <><button type="button" aria-label={`Remover categoria ${categoryName}`} title="Remover categoria" onClick={() => setOpen(true)} className="tw:inline-flex tw:size-8 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:text-[#a02119] tw:hover:bg-[#a02119] tw:hover:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-[#a02119]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="tw:size-4"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round"/></svg></button><Modal title="Remover categoria" open={open} onClose={() => { if (!pending) setOpen(false); }} fixedSize={false} width="tw:max-w-[480px]" tone="management-strong"><form action={action} onSubmit={event => event.stopPropagation()} className="tw:grid tw:min-w-0 tw:gap-3"><input type="hidden" name="tournamentId" value={tournamentId}/><input type="hidden" name="categoryId" value={categoryId}/><input type="hidden" name="expectedRegistrationCount" value={registrationCount}/><p className="tw:m-0 tw:text-sm tw:text-[#231f20]"><strong>{categoryName}</strong> tem {registrationCount} {registrationCount === 1 ? "inscrição" : "inscrições"}.</p><p className="tw:m-0 tw:text-sm tw:leading-relaxed tw:text-[#465c75]">A categoria ficará fora do evento e não aceitará novas inscrições. Pagamentos, resultados e históricos serão preservados.</p><label className="tw:flex tw:items-start tw:gap-2 tw:text-sm tw:text-[#231f20]"><input type="checkbox" name="confirmed" required className="tw:mt-1 tw:shrink-0"/>Confirmo a remoção desta categoria.</label>{state.error ? <p role="alert" className="tw:m-0 tw:text-sm tw:text-[#a02119]">{state.error}</p> : null}<div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[#cfdaea] tw:pt-3"><button type="button" className={ui.secondary} disabled={pending} onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className={ui.danger} disabled={pending}>{pending ? "Removendo..." : "Remover categoria"}</button></div></form></Modal></>;
}
