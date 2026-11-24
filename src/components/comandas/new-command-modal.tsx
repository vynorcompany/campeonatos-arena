"use client";
import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { arenaDateInput } from "@/lib/calendar/arena-wall-clock";
import { viewStyles } from "./new-command-modal.utilities";

import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";

type PlayerOption = { id: string; name: string };

export function NewCommandModal({ players, closeHref, action, cardsEnabled = false, canCreateClient = false }: { canCreateClient?:boolean; cardsEnabled?: boolean; players: PlayerOption[]; closeHref: string; action: (formData: FormData) => Promise<unknown> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectionLock = useRef(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const opening = isPending;
  const [cardNumber, setCardNumber] = useState("");

  const closeDialog = useCallback(() => {
    if (!selectionLock.current) router.push(closeHref);
  }, [closeHref, router]);

  function openSelectedClient() {
    const playerId = selectedPlayerId;
    if (!playerId || selectionLock.current) return;
    selectionLock.current = true;
    setSelectedPlayerId(playerId);
    setError(null);
    const formData = new FormData();
    formData.set("type", "CLIENT");
    formData.set("date", new URL(closeHref, window.location.origin).searchParams.get("date") ?? arenaDateInput(new Date()));
    formData.set("playerId", playerId);
    if (cardsEnabled && cardNumber.trim()) formData.set("cardNumber", cardNumber.trim());
    startTransition(async () => {
      try {
        const result = await action(formData);
        const openedAt = result && typeof result === "object" && "openedAt" in result && typeof result.openedAt === "string" ? result.openedAt : null;
        const destination = new URL(closeHref, window.location.origin);
        const comandaId = result && typeof result === "object" && "comandaId" in result && typeof result.comandaId === "string" ? result.comandaId : null;
        if (!comandaId) throw new Error("Não foi possível identificar a comanda aberta.");
        destination.searchParams.delete("ids");
        destination.searchParams.delete("search");
        if (openedAt) destination.searchParams.set("date", arenaDateInput(new Date(openedAt)));
        router.push(`${destination.pathname}${destination.search}`);
        router.refresh();
      } catch (caughtError) {
        selectionLock.current = false;
        setSelectedPlayerId(null);
        setError(caughtError instanceof Error ? caughtError.message : "Não foi possível abrir a comanda.");
      }
    });
  }

  return <Modal fixedSize={false} heightClassName="tw:rounded! tw:[&_button]:rounded! tw:[&_button]:font-normal! tw:[&_input]:rounded! tw:[&_select]:rounded!" title="Nova comanda" open onClose={closeDialog} width="tw:max-w-[440px]">
    <div className="commands-new-modal tw:grid tw:gap-3">

      {cardsEnabled ? <label className={viewStyles.field}>Número do cartão de comanda<input value={cardNumber} onChange={event => setCardNumber(event.currentTarget.value)} maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="Opcional · digite ou leia o cartão" disabled={opening}/></label> : null}
      <label className={viewStyles.field}>Cliente<SmartEntitySelect compactCorners name="playerId" label="Buscar cliente" createKind={canCreateClient ? "client" : undefined} value={selectedPlayerId ?? ""} onChange={event=>setSelectedPlayerId(event.currentTarget.value || null)} disabled={opening}><option value="">Pesquisar e selecionar</option>{players.map(player=><option key={player.id} value={player.id}>{player.name}</option>)}</SmartEntitySelect></label>
      <footer className="tw:flex tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className="tw:rounded tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal" disabled={opening} onClick={closeDialog}>Cancelar</button><button type="button" className="tw:rounded tw:border-0 tw:bg-[#087c4b] tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal tw:text-white tw:disabled:opacity-50" disabled={opening || !selectedPlayerId} onClick={openSelectedClient}>{opening ? "Abrindo…" : "Abrir comanda"}</button></footer>
      {error ? <p className={viewStyles.form_error} role="alert">{error}</p> : null}
    </div>
  </Modal>;
}
