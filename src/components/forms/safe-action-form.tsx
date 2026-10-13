"use client";
import { viewStyles } from "./safe-action-form.utilities";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type SafeActionFormProps = {
  action: (formData: FormData) => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  closeClosestDetailsOnSuccess?: boolean;
  successMessage?: string;
  successHref?: string;
  confirmKeyword?: string;
  confirmPrompt?: string;
  confirmationContent?: React.ReactNode;
  onSuccess?: () => void;
  validate?: (formData: FormData) => string | null;
};

const confirmationLabels: Record<string, { title: string; action: string; pending: string; destructive: boolean }> = {
  EXCLUIR: { title: "Confirmar exclusão", action: "Excluir", pending: "Excluindo...", destructive: true },
  REMOVER: { title: "Confirmar remoção", action: "Remover", pending: "Removendo...", destructive: true },
  RESETAR: { title: "Confirmar redefinição", action: "Resetar", pending: "Resetando...", destructive: true },
  ENCERRAR: { title: "Confirmar encerramento", action: "Encerrar", pending: "Encerrando...", destructive: true },
  APLICAR: { title: "Confirmar aplicação", action: "Aplicar", pending: "Aplicando...", destructive: false },
  ALTERAR: { title: "Confirmar alteração", action: "Alterar", pending: "Alterando...", destructive: false },
};

export function SafeActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  closeClosestDetailsOnSuccess = false,
  successMessage = "Salvo com sucesso.",
  successHref,
  confirmKeyword,
  confirmPrompt,
  confirmationContent,
  onSuccess,
  validate,
}: SafeActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const confirmation = confirmationLabels[confirmKeyword?.toUpperCase() ?? ""] ?? {
    title: "Confirmar ação", action: "Confirmar", pending: "Confirmando...", destructive: false,
  };

  useEffect(() => {
    if (!isConfirming) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsConfirming(false);
        setConfirmValue("");
        setError(null);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isConfirming]);

  return (
    <form
      id={formId}
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const formData = new FormData(event.currentTarget);
        const validationError = validate?.(formData);
        if (validationError) {
          setError(validationError);
          return;
        }
        if (confirmKeyword && !isConfirming) {
          setError(null);
          setSuccess(null);
          setConfirmValue("");
          setIsConfirming(true);
          return;
        }

        if (
          confirmKeyword &&
          confirmValue.trim().toUpperCase() !== confirmKeyword.toUpperCase()
        ) {
          setError(`Digite ${confirmKeyword} para confirmar.`);
          return;
        }

        setError(null);
        setSuccess(null);

        startTransition(async () => {
          try {
            const result = await action(formData);
            if (
              result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
            ) {
              setError(result.error);
              return;
            }
            setSuccess(successMessage);
            onSuccess?.();
            setIsConfirming(false);
            setConfirmValue("");
            if (resetOnSuccess) {
              formRef.current?.reset();
            }
            if (closeClosestDetailsOnSuccess) {
              formRef.current?.closest("details")?.removeAttribute("open");
            }
            if (successHref) {
              router.push(successHref);
            } else {
              router.refresh();
            }
          } catch (caughtError) {
            setError(
              caughtError instanceof Error
                ? caughtError.message
                : "Não foi possível concluir a ação.",
            );
          }
        });
      }}
      aria-busy={isPending}
    >
      {children}
      {confirmKeyword && isConfirming ? createPortal(
        <div className={viewStyles.safe_action_confirmation_backdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) {
            setIsConfirming(false);
            setConfirmValue("");
            setError(null);
          }
        }}>
          <section className={viewStyles.safe_action_confirmation} role="dialog" aria-modal="true" aria-labelledby="safe-action-confirm-title">
            <header>
              <span className={confirmation.destructive ? viewStyles.safe_action_confirmation_icon : viewStyles.safe_action_confirmation_icon_neutral} aria-hidden="true">!</span>
              <div><strong id="safe-action-confirm-title">{confirmation.title}</strong><span>{confirmation.destructive ? "Esta ação pode ser irreversível." : "Revise os dados antes de continuar."}</span></div>
            </header>
            <p>{confirmPrompt ?? `Digite ${confirmKeyword} para confirmar esta ação.`}</p>
            {confirmationContent ? (
              <div ref={(element) => {
                element?.querySelectorAll("input, select, textarea").forEach((control) => {
                  control.setAttribute("form", formId);
                });
              }}>{confirmationContent}</div>
            ) : null}
            <label>
              Confirmação
              <input
                name="confirmKeyword"
                form={formId}
                type="text"
                value={confirmValue}
                onChange={(event) => setConfirmValue(event.currentTarget.value)}
                placeholder={`Digite ${confirmKeyword}`}
                autoFocus
              />
            </label>
            <footer>
              <button type="button" className={viewStyles.button} onClick={() => { setIsConfirming(false); setConfirmValue(""); setError(null); }} disabled={isPending}>Cancelar</button>
              <button type="submit" form={formId} className={confirmation.destructive ? viewStyles.button_button_danger : viewStyles.button_button_primary} disabled={isPending}>{isPending ? confirmation.pending : confirmation.action}</button>
            </footer>
          </section>
        </div>, document.body
      ) : null}
      {error ? (
        <p className={viewStyles.form_error_form_full} role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className={viewStyles.form_success_form_full}>{success}</p> : null}
    </form>
  );
}
