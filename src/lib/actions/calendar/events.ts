"use server";
import { runCalendarManagementMutation } from "@/lib/calendar/management-mutation";
export async function createCalendarEventAction(form: FormData) { return runCalendarManagementMutation("event-create", form); }
export async function updateCalendarEventAction(form: FormData) { return runCalendarManagementMutation("event-update", form); }
export async function deleteCalendarEventAction(form: FormData) { return runCalendarManagementMutation("event-delete", form); }
