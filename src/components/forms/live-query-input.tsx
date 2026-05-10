"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function LiveQueryInput({
  name,
  placeholder,
  defaultValue,
  ariaLabel
}: {
  name: string;
  placeholder: string;
  defaultValue?: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <input
      name={name}
      type="search"
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => {
        const value = event.currentTarget.value;
        const next = new URLSearchParams(params.toString());
        if (value.trim()) next.set(name, value);
        else next.delete(name);

        startTransition(() => {
          router.replace(`${pathname}?${next.toString()}`);
        });
      }}
      data-pending={isPending ? "true" : "false"}
    />
  );
}
