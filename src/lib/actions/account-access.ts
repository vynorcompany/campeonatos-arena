"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { remoteManagementAuthentication } from "@/lib/backend/management-auth-client";
import type { ManagementAuthOperation } from "@/lib/backend/contracts/management-auth";
export type AccountAccessState = { error: string | null; success: string | null; invitationUrl?: string };

async function execute(operation: ManagementAuthOperation, form: FormData): Promise<AccountAccessState> {
  let result: AccountAccessState;
  let destination: string | undefined;
  if (process.env.VX4_BACKEND_ORIGIN) {
    try {
      const remote = await remoteManagementAuthentication(process.env.VX4_BACKEND_ORIGIN, operation, form);
      destination = remote.redirectTo;
      result = { error: remote.error, success: remote.success ?? null, ...(remote.invitationUrl ? { invitationUrl: remote.invitationUrl } : {}) };
    } catch { return { error: "Não foi possível concluir a solicitação. Tente novamente.", success: null }; }
  } else {
    const local = await import("@/lib/backend/services/account-access");
    switch (operation) {
      case "invite": result = await local.inviteArenaUserAction({ error: null, success: null }, form); break;
      case "request-reset": result = await local.requestPasswordResetAction({ error: null, success: null }, form); break;
      case "send-user-recovery": result = await local.sendArenaUserRecoveryAction({ error: null, success: null }, form); break;
      case "complete-reset": result = await local.completePasswordResetAction({ error: null, success: null }, form); break;
      case "accept-invite": result = await local.acceptArenaInviteAction({ error: null, success: null }, form); break;
      case "revoke-invite": result = await local.revokeArenaInviteAction(form); break;
      default: throw new Error("Unsupported account operation");
    }
  }
  if (destination) redirect(destination);
  if (!result.error && ['invite', 'revoke-invite'].includes(operation)) revalidatePath('/usuarios');
  return result;
}

export async function inviteArenaUserAction(_: AccountAccessState, form: FormData): Promise<AccountAccessState> {
  return execute("invite", form);
}

export async function requestPasswordResetAction(_: AccountAccessState, form: FormData): Promise<AccountAccessState> {
  return execute("request-reset", form);
}

export async function sendArenaUserRecoveryAction(_: AccountAccessState, form: FormData): Promise<AccountAccessState> {
  return execute("send-user-recovery", form);
}

export async function completePasswordResetAction(_: AccountAccessState, form: FormData): Promise<AccountAccessState> {
  return execute("complete-reset", form);
}

export async function acceptArenaInviteAction(_: AccountAccessState, form: FormData): Promise<AccountAccessState> {
  return execute("accept-invite", form);
}

export async function revokeArenaInviteAction(form: FormData) { const result = await execute("revoke-invite", form); if (result.error) throw new Error(result.error); }
