"use client";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestLessonCreditRescheduleAction } from "@/lib/actions/lesson-credit-settings";
export function RequestCreditRescheduleButton({arenaSlug,batchId}:{arenaSlug:string;batchId:string}){return <SafeActionForm action={requestLessonCreditRescheduleAction} successMessage="Pedido enviado à arena e ao professor responsável."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="batchId" value={batchId}/><SubmitButton label="Pedir reagendamento" pendingLabel="Enviando..." className="tw:inline-flex tw:min-h-8 tw:items-center tw:justify-center tw:rounded-md tw:border tw:border-[#b78016] tw:bg-[#fff5da] tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal tw:text-[#785000] tw:hover:bg-[#ffe9ae] tw:dark:border-[#a77928] tw:dark:bg-[#493819] tw:dark:text-[#ffe3a0]"/></SafeActionForm>;}
