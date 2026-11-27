"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function createClassGroupAction(form: FormData) { return runAcademyMutation('create-class-group', form); }
export async function updateTeacherClassGroupAction(form: FormData) { return runAcademyMutation('update-teacher-class-group', form); }
export async function updateTeacherClassGroupCapacityAction(form: FormData) { return runAcademyMutation('update-teacher-class-group-capacity', form); }
export async function moveTeacherClassGroupStudentAction(form: FormData) { return runAcademyMutation('move-teacher-class-group-student', form); }
