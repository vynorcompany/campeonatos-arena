"use server";
import { runCalendarManagementMutation } from "@/lib/calendar/management-mutation";
export async function createQuickPlayerAction(form: FormData) { return runCalendarManagementMutation("client-create", form); }
