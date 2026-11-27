"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function createTeacherStudentAction(form: FormData) { return runAcademyMutation('create-teacher-student', form); }
export async function transferTeacherStudentAction(form: FormData) { return runAcademyMutation('transfer-teacher-student', form); }
export async function createTeacherPlanAction(form: FormData) { return runAcademyMutation('create-teacher-plan', form); }
export async function createTeacherPlanWithPriceAction(form: FormData) { return runAcademyMutation('create-teacher-plan-with-price', form); }
export async function updateTeacherPlanWithPriceAction(form: FormData) { return runAcademyMutation('update-teacher-plan-with-price', form); }
export async function assignTeacherPlanStudentAction(form: FormData) { return runAcademyMutation('assign-teacher-plan-student', form); }
export async function copyTeacherPlansAction(form: FormData) { return runAcademyMutation('copy-teacher-plans', form); }
export async function removeTeacherPlanStudentAction(form: FormData) { return runAcademyMutation('remove-teacher-plan-student', form); }
