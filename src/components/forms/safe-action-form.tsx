"use client";
import { Modal } from "@/components/ui/modal";

import { viewStyles } from "./safe-action-form.utilities";

import { useCallback, useId, useRef, useState, useTransition } from "react";
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

  const closeConfirmation = useCallback(() => {
    if (isPending) return;
    setIsConfirming(false);
    setConfirmValue("");
    setError(null);
  }, [isPending]);

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
      {confirmKeyword ? <Modal title={confirmation.title} open={isConfirming} onClose={closeConfirmation} width="tw:max-w-[480px]" fixedSize>
        <div className="tw:flex tw:min-h-full tw:min-w-0 tw:flex-col tw:gap-4">
          <p className="tw:m-0 tw:break-words tw:text-sm tw:leading-relaxed">{confirmPrompt ?? `Digite ${confirmKeyword} para confirmar esta ação.`}</p>
          {confirmationContent ? <div ref={element => { element?.querySelectorAll("input, select, textarea").forEach(control => control.setAttribute("form", formId)); }}>{confirmationContent}</div> : null}
          <label className="tw:grid tw:gap-2 tw:text-sm tw:font-semibold">Confirmação
            <input data-modal-autofocus name="confirmKeyword" form={formId} type="text" value={confirmValue} onChange={event => setConfirmValue(event.currentTarget.value)} placeholder={`Digite ${confirmKeyword}`} className="tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-sm tw:font-normal"/>
          </label>
          {error ? <p className={viewStyles.form_error_form_full} role="alert">{error}</p> : null}
          <footer className="tw:mt-auto tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3">
            <button type="button" className={viewStyles.button} onClick={closeConfirmation} disabled={isPending}>Cancelar</button>
            <button type="submit" form={formId} className={confirmation.destructive ? viewStyles.button_button_danger : viewStyles.button_button_primary} disabled={isPending}>{isPending ? confirmation.pending : confirmation.action}</button>
          </footer>
        </div>
      </Modal> : null}
      {error && !isConfirming ? (
        <p className={viewStyles.form_error_form_full} role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className={viewStyles.form_success_form_full}>{success}</p> : null}
    </form>
  );
}
