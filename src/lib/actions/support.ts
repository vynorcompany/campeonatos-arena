"use server";
import { runSupportMutation } from "@/lib/support/mutation";
export async function createSupportTicketAction(form:FormData) { return runSupportMutation("create",form); }
export async function updateAgencyTicketAction(form:FormData) { return runSupportMutation("update",form); }
export async function addSupportTicketMessageAction(form:FormData) { return runSupportMutation("message",form); }
