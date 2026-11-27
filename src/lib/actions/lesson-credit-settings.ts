"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function saveLessonPlanExpiryAction(form: FormData) { return runAcademyMutation('save-lesson-plan-expiry', form); }
export async function saveLessonMakeupPolicyAction(form: FormData) { return runAcademyMutation('save-lesson-makeup-policy', form); }
export async function requestLessonCreditRescheduleAction(form: FormData) { return runAcademyMutation('request-lesson-credit-reschedule', form); }
export async function resolveLessonCreditRequestAction(form: FormData) { return runAcademyMutation('resolve-lesson-credit-request', form); }
export async function resolveTeacherLessonCreditRequestAction(form: FormData) { return runAcademyMutation('resolve-teacher-lesson-credit-request', form); }
