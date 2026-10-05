"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./submit-button.utilities";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({ label, pendingLabel, className, disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={cx(className ?? viewStyles.button)} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel ?? "Processando..." : label}
    </button>
  );
}
