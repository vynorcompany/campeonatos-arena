"use client";
import { viewStyles } from "./workspace-switcher.utilities";

import { setWorkspaceAction } from "@/lib/auth/actions";
import type { ArenaMembership } from "@/types/auth";
import { SidebarPopover } from "./sidebar-popover";

type WorkspaceSwitcherProps = {
  activeArenaId: string | null;
  memberships: ArenaMembership[];
  canAccessAgency: boolean;
  currentWorkspace: "agency" | "arena";
};

export function WorkspaceSwitcher({
  activeArenaId,
  memberships,
  canAccessAgency,
  currentWorkspace
}: WorkspaceSwitcherProps) {
  if (!canAccessAgency && memberships.length <= 1) {
    return null;
  }

  const selectedId = currentWorkspace === "agency" ? "agency" : activeArenaId ?? memberships[0]?.arenaId;
  const selectedName = selectedId === "agency" ? "Agência" : memberships.find(item => item.arenaId === selectedId)?.arenaName ?? "Selecione uma arena";
  const environments = [...(canAccessAgency ? [{ id: "agency", name: "Agência" }] : []), ...memberships.map(item => ({ id: item.arenaId, name: item.arenaName }))];
  return <div className={viewStyles.workspace_switcher}>
    <SidebarPopover label="Trocar ambiente" trigger={<><svg className="tw:size-5 tw:shrink-0 tw:text-white/65" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 21V5l8-2v18M12 8h8v13M8 7v1m0 4v1m0 4v1m8-6v1m0 4v1M2 21h20" /></svg><span className="tw:grid tw:min-w-0 tw:gap-0.5"><span className={viewStyles.workspace_switcher_label}>Ambiente</span><span className="tw:text-sm tw:font-medium tw:[overflow-wrap:anywhere]">{selectedName}</span></span></>}>
      <form action={setWorkspaceAction} className="tw:grid tw:max-h-[min(340px,50dvh)] tw:gap-1 tw:overflow-y-auto">
        {environments.map(item => <button key={item.id} type="submit" name="workspaceId" value={item.id} aria-current={item.id === selectedId ? "true" : undefined} className={viewStyles.workspace_option}><span className="tw:min-w-0 tw:[overflow-wrap:anywhere]">{item.name}</span>{item.id === selectedId ? <span aria-hidden="true">✓</span> : null}</button>)}
      </form>
    </SidebarPopover>
  </div>;
}
