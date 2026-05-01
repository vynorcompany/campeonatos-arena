"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SafeActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: string;
};

export function SafeActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successMessage = "Salvo com sucesso."
}: SafeActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setError(null);
        setSuccess(null);

        startTransition(async () => {
          try {
            await action(formData);
            setSuccess(successMessage);
            if (resetOnSuccess) {
              formRef.current?.reset();
            }
            router.refresh();
          } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : "Não foi possível concluir a ação.");
          }
        });
      }}
      aria-busy={isPending}
    >
      {children}
      {error ? <p className="form-error form-full" role="alert">{error}</p> : null}
      {success ? <p className="form-success form-full">{success}</p> : null}
    </form>
  );
}
