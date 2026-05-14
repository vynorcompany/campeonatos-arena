"use client";

import { useRef } from "react";

type AutoSubmitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
};

export function AutoSubmitForm({ action, className, children }: AutoSubmitFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onChange={() => formRef.current?.requestSubmit()}
    >
      {children}
    </form>
  );
}
