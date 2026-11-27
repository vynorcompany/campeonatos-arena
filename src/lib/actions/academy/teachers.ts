"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function createTeacherAction(form: FormData) { return runAcademyMutation('create-teacher', form); }
export async function archiveTeacherAction(form: FormData) { return runAcademyMutation('archive-teacher', form); }
export async function deleteTeacherAction(form: FormData) { return runAcademyMutation('delete-teacher', form); }
