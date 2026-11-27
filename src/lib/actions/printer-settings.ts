"use server";
import { runArenaSettingsMutation } from "@/lib/settings/mutation";
export async function savePrinterSettingsAction(form: FormData) { return runArenaSettingsMutation("printer",form); }
