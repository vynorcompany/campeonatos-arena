"use server";
import { redirect } from "next/navigation";
import { remotePortalAuthentication } from "@/lib/backend/portal-auth-client";
import type { PublicClientAuthState, PublicAuthOperation, PublicAuthOutcome } from "@/lib/backend/contracts/player-auth";
export type { PublicClientAuthState } from "@/lib/backend/contracts/player-auth";

async function execute(operation: PublicAuthOperation, form: FormData): Promise<PublicClientAuthState> {
  let result: PublicAuthOutcome;
  if (process.env.VX4_BACKEND_ORIGIN) {
    try { result = await remotePortalAuthentication(process.env.VX4_BACKEND_ORIGIN, operation, form); }
    catch { return { error: "Não foi possível validar o acesso. Tente novamente." }; }
  } else {
    const local = await import("@/lib/backend/services/player-auth");
    switch (operation) {
      case "register": result = await local.registerPublicClientAction({ error: null }, form); break;
      case "confirm-registration": result = await local.confirmPublicClientRegistrationAction({ error: null }, form); break;
      case "login": result = await local.loginPublicClientAction({ error: null }, form); break;
      case "login-global": result = await local.loginGlobalAthleteAction({ error: null }, form); break;
      case "request-global-reset": result = await local.requestGlobalPublicPasswordResetAction({ error: null }, form); break;
      case "confirm-global-reset": result = await local.confirmGlobalPublicPasswordResetAction({ error: null }, form); break;
      case "request-reset": result = await local.requestPublicPasswordResetAction({ error: null }, form); break;
      case "confirm-reset": result = await local.confirmPublicPasswordResetAction({ error: null }, form); break;
      case "logout": result = await local.logoutPublicClientAction(form); break;
      case "logout-portal": result = await local.logoutAthletePortalAction(form); break;
      default: throw new Error("Unsupported Portal operation");
    }
  }
  if (result.redirectTo) redirect(result.redirectTo);
  const { redirectTo: _redirectTo, ...state } = result;
  return state;
}

export async function registerPublicClientAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("register", form);
}

export async function confirmPublicClientRegistrationAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("confirm-registration", form);
}

export async function loginPublicClientAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("login", form);
}

export async function loginGlobalAthleteAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("login-global", form);
}

export async function requestGlobalPublicPasswordResetAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("request-global-reset", form);
}

export async function confirmGlobalPublicPasswordResetAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("confirm-global-reset", form);
}

export async function requestPublicPasswordResetAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("request-reset", form);
}

export async function confirmPublicPasswordResetAction(_: PublicClientAuthState, form: FormData): Promise<PublicClientAuthState> {
  return execute("confirm-reset", form);
}

export async function logoutPublicClientAction(form: FormData) { await execute("logout", form); }
export async function logoutAthletePortalAction(form: FormData) { await execute("logout-portal", form); }
