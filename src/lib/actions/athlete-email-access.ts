"use server";
import { revalidatePath } from "next/cache";
import { remotePortalAuthentication } from "@/lib/backend/portal-auth-client";
import type { PublicAuthOperation } from "@/lib/backend/contracts/player-auth";
export type AthleteEmailAccessState = { error: string | null; success?: string };

async function execute(operation: PublicAuthOperation, form: FormData): Promise<AthleteEmailAccessState> {
  let result: AthleteEmailAccessState;
  if (process.env.VX4_BACKEND_ORIGIN) {
    try { result = await remotePortalAuthentication(process.env.VX4_BACKEND_ORIGIN, operation, form); }
    catch { return { error: "Não foi possível validar o acesso. Tente novamente." }; }
  } else {
    const local = await import("@/lib/backend/services/athlete-email-access");
    switch (operation) {
      case "request-email-verification": result = await local.requestAthleteEmailVerificationAction({ error: null }, form); break;
      case "confirm-email": result = await local.confirmAthleteEmailAction({ error: null }, form); break;
      case "request-email-reset": result = await local.requestAthleteEmailPasswordResetAction({ error: null }, form); break;
      case "complete-email-reset": result = await local.completeAthleteEmailPasswordResetAction({ error: null }, form); break;
      default: throw new Error("Unsupported email operation");
    }
  }
  if (operation === "confirm-email" && result.success) revalidatePath("/reservar", "layout");
  return result;
}

export async function requestAthleteEmailVerificationAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  return execute("request-email-verification", form);
}

export async function confirmAthleteEmailAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  return execute("confirm-email", form);
}

export async function requestAthleteEmailPasswordResetAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  return execute("request-email-reset", form);
}

export async function completeAthleteEmailPasswordResetAction(_: AthleteEmailAccessState, form: FormData): Promise<AthleteEmailAccessState> {
  return execute("complete-email-reset", form);
}
