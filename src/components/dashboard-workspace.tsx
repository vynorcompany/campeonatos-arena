"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { sharedUtilities } from "./ui/shared.utilities";

const DashboardLayoutContext = createContext({ resetVersion: 0 });
export function DashboardWorkspace({ children, className }: { children: ReactNode; className?: string }) {
  const [resetVersion, setResetVersion] = useState(0);
  return <DashboardLayoutContext.Provider value={{ resetVersion }}>
    <div className={className}>
      <div className="tw:flex tw:justify-end"><button type="button" className={sharedUtilities.buttonButtonSmall} onClick={() => setResetVersion(value => value + 1)}>Restaurar organização</button></div>
      {children}
    </div>
  </DashboardLayoutContext.Provider>;
}
export function useDashboardLayout() { return useContext(DashboardLayoutContext); }
