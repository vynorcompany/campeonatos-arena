"use server";
import { runArenaSettingsMutation } from "@/lib/settings/mutation";
export async function saveCancellationPolicyAction(form: FormData) { return runArenaSettingsMutation("policies",form); }
