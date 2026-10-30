"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Modal } from "./modal";
import { operationalWorkspace as ui } from "./operational-workspace";

export function SettingsDialogButton({ label, title = label, children, secondary = false }: { label: string; title?: string; children: ReactNode; secondary?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <><button type="button" className={secondary ? ui.secondary : ui.primary} onClick={() => setOpen(true)}>{label}</button><Modal title={title} open={open} onClose={close}>{children}</Modal></>;
}
