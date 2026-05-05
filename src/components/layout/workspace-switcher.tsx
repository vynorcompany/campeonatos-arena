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
      >
        {canAccessAgency ? <option value="agency">Agencia</option> : null}
        {memberships.map((membership, index) => (
          <option key={membership.arenaId} value={membership.arenaId}>
            #{index + 1} {membership.arenaName}
          </option>
        ))}
      </select>
      <button type="submit" aria-label="Trocar ambiente">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m7 7 5-5 5 5" />
          <path d="M12 2v20" />
          <path d="m17 17-5 5-5-5" />
        </svg>
      </button>
    </form>
  );
}
