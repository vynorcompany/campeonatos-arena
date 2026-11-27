"use server";
import { runArenaSettingsMutation } from "@/lib/settings/mutation";
export async function revokeDeviceSessionAction(form: FormData) { return runArenaSettingsMutation("device-revoke",form); }
