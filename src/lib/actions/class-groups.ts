"use server";
import { runAcademyMutation } from "@/lib/academy/mutation";
export async function checkInPortalLessonAction(form: FormData) { return runAcademyMutation('check-in-portal-lesson', form); }
export async function requestPortalLessonMakeupAction(form: FormData) { return runAcademyMutation('request-portal-lesson-makeup', form); }
export async function requestClassGroupAction(form: FormData) { return runAcademyMutation('request-class-group', form); }
export async function approveClassGroupRequestAction(form: FormData) { return runAcademyMutation('approve-class-group-request', form); }
export async function moveClassGroupStudentAction(form: FormData) { return runAcademyMutation('move-class-group-student', form); }
export async function updateTeacherPortalClassGroupCapacityAction(form: FormData) { return runAcademyMutation('update-teacher-portal-class-group-capacity', form); }
export async function adjustTeacherStudentBalanceAction(form: FormData) { return runAcademyMutation('adjust-teacher-student-balance', form); }
export async function notifyTeacherStudentAction(form: FormData) { return runAcademyMutation('notify-teacher-student', form); }
export async function registerClassGroupMakeupAction(form: FormData) { return runAcademyMutation('register-class-group-makeup', form); }
export async function scheduleTeacherMakeupAction(form: FormData) { return runAcademyMutation('schedule-teacher-makeup', form); }
