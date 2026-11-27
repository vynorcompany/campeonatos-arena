"use server";
import{remoteClientRegistrationDefault}from"@/lib/backend/lookup-client";
export async function clientComandaPermissionDefaultAction(){const origin=process.env.VX4_BACKEND_ORIGIN;return origin?remoteClientRegistrationDefault(origin):(await import("@/lib/backend/services/client-registration-defaults")).clientComandaPermissionDefaultAction();}
