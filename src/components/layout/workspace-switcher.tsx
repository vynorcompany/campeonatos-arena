"use client";

import { setWorkspaceAction } from "@/lib/auth/actions";
import type { ArenaMembership } from "@/types/auth";

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

  return (
    <form action={setWorkspaceAction} className="workspace-switcher">
      <label className="workspace-switcher-label" htmlFor="workspaceId">Ambiente</label>
      <select
        id="workspaceId"
        name="workspaceId"
        defaultValue={currentWorkspace === "agency" ? "agency" : activeArenaId ?? memberships[0]?.arenaId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {canAccessAgency ? <option value="agency">Agencia</option> : null}
        {memberships.map((membership, index) => (
          <option key={membership.arenaId} value={membership.arenaId}>
            #{index + 1} {membership.arenaName}
          </option>
        ))}
      </select>
    </form>
  );
}
