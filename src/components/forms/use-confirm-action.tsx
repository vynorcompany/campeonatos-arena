"use client";
import { Modal } from "@/components/ui/modal";


import { useCallback, useState } from "react";
import { viewStyles } from "./safe-action-form.utilities";

type Confirmation = {
  message: string;
  onConfirm: () => void | Promise<void>;
  keyword?: string;
  title?: string;
  actionLabel?: string;
};

/** The same confirmation surface used by SafeActionForm for client-side actions. */
export function useConfirmAction() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setValue("");
    setError("");
  }, [pending]);

  const confirm = (request: Confirmation) => {
    setValue("");
    setError("");
    setConfirmation(request);
  };

  const submit = async () => {
    if (!confirmation || pending) return;
    if (confirmation.keyword && value.trim().toUpperCase() !== confirmation.keyword.toUpperCase()) {
      setError(`Digite ${confirmation.keyword} para confirmar.`);
      return;
    }
    setPending(true);
    setError("");
    try {
      await confirmation.onConfirm();
      setConfirmation(null);
      setValue("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a ação.");
    } finally {
      setPending(false);
    }
  };

  const confirmationDialog = confirmation ? (
    <Modal title={confirmation.title ?? "Confirmar exclusão"} open onClose={close} width="tw:max-w-[480px]">
      <div className="tw:flex tw:min-h-full tw:flex-col tw:gap-4">
        <p>{confirmation.message}</p>
        {confirmation.keyword ? <label className="tw:grid tw:gap-2 tw:text-sm tw:font-semibold">Confirmação<input data-modal-autofocus className="tw:min-h-10 tw:w-full tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-3" value={value} onChange={(event) => setValue(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void submit(); } }} placeholder={`Digite ${confirmation.keyword}`} /></label> : null}
        {error ? <p role="alert" className={viewStyles.form_error_form_full}>{error}</p> : null}
        <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3">
          <button type="button" className={viewStyles.button} onClick={close} disabled={pending}>Cancelar</button>
          <button type="button" className={viewStyles.button_button_danger} onClick={() => void submit()} disabled={pending}>{pending ? "Aguarde..." : confirmation.actionLabel ?? "Excluir"}</button>
        </footer>
      </div>
    </Modal>
  ) : null;

  return { confirm, confirmationDialog };
}
