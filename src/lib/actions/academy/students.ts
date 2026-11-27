"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function createStudentAction(form: FormData) { return runAcademyMutation('create-student', form); }
export async function addStudentCreditsAction(form: FormData) { return runAcademyMutation('add-student-credits', form); }
export async function updateStudentAction(form: FormData) { return runAcademyMutation('update-student', form); }
export async function deleteStudentAction(form: FormData) { return runAcademyMutation('delete-student', form); }
