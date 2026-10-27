"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

import { sharedUtilities } from "./ui/shared.utilities";

const DashboardLayoutContext = createContext({ editing: false, resetVersion: 0 });

export function DashboardWorkspace({ children, className }: { children: ReactNode; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  return <DashboardLayoutContext.Provider value={{ editing, resetVersion }}>
    <div className={className}>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2">
        {editing ? <><span className="tw:mr-auto tw:text-xs tw:text-slate-600">Arraste pela alça ou use as setas. Alterações salvas neste navegador.</span><button type="button" className={sharedUtilities.buttonButtonSmall} onClick={() => setResetVersion(value => value + 1)}>Restaurar organização</button></> : null}
        <button type="button" className={editing ? sharedUtilities.buttonButtonPrimary : sharedUtilities.buttonButtonSmall} aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? "Concluir organização" : "Organizar dashboard"}</button>
      </div>
      {children}
    </div>
  </DashboardLayoutContext.Provider>;
}

export function useDashboardLayout() { return useContext(DashboardLayoutContext); }
