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
  confirmPrompt
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
        if (confirmKeyword && !isConfirming) {
          setError(null);
          setSuccess(null);
          setConfirmValue("");
          setIsConfirming(true);
          return;
        }

        if (confirmKeyword && confirmValue.trim().toUpperCase() !== confirmKeyword.toUpperCase()) {
          setError(`Digite ${confirmKeyword} para confirmar.`);
          return;
        }

        const formData = new FormData(event.currentTarget);

        setError(null);
        setSuccess(null);

        startTransition(async () => {
          try {
            await action(formData);
            setSuccess(successMessage);
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
            setError(caughtError instanceof Error ? caughtError.message : "Não foi possível concluir a ação.");
          }
        });
      }}
      aria-busy={isPending}
    >
      {children}
      {confirmKeyword && isConfirming ? (
        <div className="form-full stack-xs">
          <p className="muted">{confirmPrompt ?? `Digite ${confirmKeyword} para confirmar esta ação.`}</p>
          <div className="inline-form">
            <input
              name="confirmKeyword"
              type="text"
              value={confirmValue}
              onChange={(event) => setConfirmValue(event.currentTarget.value)}
              placeholder={`Digite ${confirmKeyword}`}
              autoFocus
            />
            <button type="submit" className="button button-danger" disabled={isPending}>
              Confirmar
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setIsConfirming(false);
                setConfirmValue("");
                setError(null);
              }}
              disabled={isPending}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="form-error form-full" role="alert">{error}</p> : null}
      {success ? <p className="form-success form-full">{success}</p> : null}
    </form>
  );
}
