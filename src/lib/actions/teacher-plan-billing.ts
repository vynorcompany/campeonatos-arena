"use server";
import { runTeacherBilling } from '@/lib/academy/teacher-billing-mutation';
import { teacherTransferPreviewSchema, teacherBillingMutationSchema } from '@/lib/backend/contracts/teacher-plan-billing';
export async function previewPlanTransferAction(form: FormData) { return teacherTransferPreviewSchema.parse(await runTeacherBilling('preview', form)); }
export async function transferStudentPlanAction(form: FormData) { return teacherBillingMutationSchema.parse(await runTeacherBilling('transfer', form)); }
export async function schedulePlanPriceChangeAction(form: FormData) { return teacherBillingMutationSchema.parse(await runTeacherBilling('schedule', form)); }
export async function cancelPlanPriceChangeAction(form: FormData) { return teacherBillingMutationSchema.parse(await runTeacherBilling('cancel', form)); }
