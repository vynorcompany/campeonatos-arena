"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function createLessonAction(form: FormData) { return runAcademyMutation('create-lesson', form); }
export async function completeLessonAction(form: FormData) { return runAcademyMutation('complete-lesson', form); }
export async function deleteLessonAction(form: FormData) { return runAcademyMutation('delete-lesson', form); }
