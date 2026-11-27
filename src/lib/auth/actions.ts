"use server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { remoteManagementAuthentication } from "@/lib/backend/management-auth-client";
import type { ManagementAuthOperation, ManagementAuthOutcome, LoginState, RegisterArenaState } from "@/lib/backend/contracts/management-auth";
export type { LoginState, RegisterArenaState } from "@/lib/backend/contracts/management-auth";

async function execute(operation: ManagementAuthOperation, form: FormData): Promise<ManagementAuthOutcome> {
  let result: ManagementAuthOutcome;
  if (process.env.VX4_BACKEND_ORIGIN) {
    try { result = await remoteManagementAuthentication(process.env.VX4_BACKEND_ORIGIN, operation, form); }
    catch { return { error: "Não foi possível validar o acesso. Tente novamente." }; }
  } else {
    const local = await import("@/lib/backend/services/management-auth");
    switch (operation) {
      case "login": result = await local.loginAction({ error: null }, form); break;
      case "register-arena": result = await local.registerArenaAction({ error: null }, form); break;
      case "logout": result = await local.logoutAction(); break;
      case "select-arena": result = await local.setActiveArenaAction(form); break;
      case "select-workspace": result = await local.setWorkspaceAction(form); break;
      default: throw new Error("Unsupported authentication operation");
    }
  }
  if (result.redirectTo) redirect(result.redirectTo);
  return result;
}
export async function loginAction(_: LoginState, form: FormData): Promise<LoginState> { return execute("login", form); }
export async function registerArenaAction(_: RegisterArenaState, form: FormData): Promise<RegisterArenaState> { return execute("register-arena", form); }
export async function logoutAction() { const result = await execute("logout", new FormData()); if (result.error) throw new Error(result.error); }
export async function setActiveArenaAction(form: FormData) { const result = await execute("select-arena", form); if (result.error) throw new Error(result.error); }
export async function setWorkspaceAction(form: FormData) { const result = await execute("select-workspace", form); if (result.error) throw new Error(result.error); }
export async function redirectIfAuthenticated() {
  const auth = await getAuthContext();
  if (auth) redirect(["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(auth.systemRole) ? "/agencia" : "/painel");
}
