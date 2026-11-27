"use server";
import { runArenaSettingsMutation } from "@/lib/settings/mutation";
export async function releaseRetainedContactAction(form: FormData) { return runArenaSettingsMutation("privacy-release",form); }
export async function respondPrivacyRequestAction(form: FormData) { return runArenaSettingsMutation("privacy-respond",form); }
