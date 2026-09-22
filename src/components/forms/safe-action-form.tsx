"use client";

import { useRef, useState, useTransition } from "react";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
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
      {confirmKeyword && isConfirming ? (
        <div className="safe-action-confirmation-backdrop" role="presentation">
          <section className="safe-action-confirmation" role="dialog" aria-modal="true" aria-labelledby="safe-action-confirm-title">
            <header>
              <span className="safe-action-confirmation-icon" aria-hidden="true">!</span>
              <div><strong id="safe-action-confirm-title">Confirmar exclusão</strong><span>Esta ação não poderá ser desfeita.</span></div>
            </header>
            <p>{confirmPrompt ?? `Digite ${confirmKeyword} para confirmar esta ação.`}</p>
            {confirmationContent}
            <label>
              Confirmação
              <input
                name="confirmKeyword"
                type="text"
                value={confirmValue}
                onChange={(event) => setConfirmValue(event.currentTarget.value)}
                placeholder={`Digite ${confirmKeyword}`}
                autoFocus
              />
            </label>
            <footer>
              <button type="button" className="button" onClick={() => { setIsConfirming(false); setConfirmValue(""); setError(null); }} disabled={isPending}>Cancelar</button>
              <button type="submit" className="button button-danger" disabled={isPending}>{isPending ? "Excluindo..." : "Excluir"}</button>
            </footer>
          </section>
        </div>
      ) : null}
      {error ? (
        <p className="form-error form-full" role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className="form-success form-full">{success}</p> : null}
    </form>
  );
}
