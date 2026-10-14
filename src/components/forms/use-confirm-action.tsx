"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const titleId = useId();
  const trigger = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setValue("");
    setError("");
    trigger.current?.focus();
  }, [pending]);

  useEffect(() => {
    if (!confirmation) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmation, pending, close]);

  const confirm = (request: Confirmation) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      trigger.current?.focus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a ação.");
    } finally {
      setPending(false);
    }
  };

  const confirmationDialog = confirmation && typeof document !== "undefined" ? createPortal(
    <div className={viewStyles.safe_action_confirmation_backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className={viewStyles.safe_action_confirmation} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <span className={viewStyles.safe_action_confirmation_icon} aria-hidden="true">!</span>
          <div><strong id={titleId}>{confirmation.title ?? "Confirmar exclusão"}</strong><span>Esta ação pode ser irreversível.</span></div>
        </header>
        <p>{confirmation.message}</p>
        {confirmation.keyword ? <label>Confirmação<input autoFocus value={value} onChange={(event) => setValue(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void submit(); } }} placeholder={`Digite ${confirmation.keyword}`} /></label> : null}
        {error ? <p role="alert" className={viewStyles.form_error_form_full}>{error}</p> : null}
        <footer>
          <button type="button" className={viewStyles.button} onClick={close} disabled={pending}>Cancelar</button>
          <button type="button" className={viewStyles.button_button_danger} onClick={() => void submit()} disabled={pending}>{pending ? "Aguarde..." : confirmation.actionLabel ?? "Excluir"}</button>
        </footer>
      </section>
    </div>, document.body,
  ) : null;

  return { confirm, confirmationDialog };
}
