"use client";
import { useCallback, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
export function AuditDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <><button type="button" onClick={() => setOpen(true)} className="tw:w-fit tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-xs tw:font-medium tw:text-[#215da5] tw:underline tw:underline-offset-2">Ver detalhes</button><Modal title="Detalhes da auditoria" open={open} onClose={close} fixedSize width="tw:max-w-[880px]"><div className="tw:min-h-0 tw:overflow-y-auto tw:overscroll-contain">{children}</div></Modal></>;
}
