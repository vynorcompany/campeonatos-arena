import * as credits from '@/lib/backend/services/lesson-credit-settings';
import 'server-only';
import { ZodError } from 'zod';
import { AcademyOperationError } from '@/lib/backend/academy-operation-error';
import { academyMutationOutcomeSchema, type AcademyMutationOperation } from '@/lib/backend/contracts/academy-mutations';
import * as students from '@/lib/backend/services/academy-students';
import * as teachers from '@/lib/backend/services/academy-teachers';
import * as groups from '@/lib/backend/services/academy-groups';
import * as plans from '@/lib/backend/services/academy-plans';
import * as lessons from '@/lib/backend/services/academy-lessons';
const handlers = {
  'save-lesson-plan-expiry': credits.saveLessonPlanExpiryAction,
  'save-lesson-makeup-policy': credits.saveLessonMakeupPolicyAction,
  'request-lesson-credit-reschedule': credits.requestLessonCreditRescheduleAction,
  'resolve-lesson-credit-request': credits.resolveLessonCreditRequestAction,
  'resolve-teacher-lesson-credit-request': credits.resolveTeacherLessonCreditRequestAction,

  'create-student': students.createStudentAction,
  'add-student-credits': students.addStudentCreditsAction,
  'update-student': students.updateStudentAction,
  'delete-student': students.deleteStudentAction,
  'create-teacher': teachers.createTeacherAction,
  'archive-teacher': teachers.archiveTeacherAction,
  'delete-teacher': teachers.deleteTeacherAction,
  'create-class-group': groups.createClassGroupAction,
  'update-teacher-class-group': groups.updateTeacherClassGroupAction,
  'update-teacher-class-group-capacity': groups.updateTeacherClassGroupCapacityAction,
  'move-teacher-class-group-student': groups.moveTeacherClassGroupStudentAction,
  'create-teacher-student': plans.createTeacherStudentAction,
  'transfer-teacher-student': plans.transferTeacherStudentAction,
  'create-teacher-plan': plans.createTeacherPlanAction,
  'create-teacher-plan-with-price': plans.createTeacherPlanWithPriceAction,
  'update-teacher-plan-with-price': plans.updateTeacherPlanWithPriceAction,
  'assign-teacher-plan-student': plans.assignTeacherPlanStudentAction,
  'copy-teacher-plans': plans.copyTeacherPlansAction,
  'remove-teacher-plan-student': plans.removeTeacherPlanStudentAction,
  'create-lesson': lessons.createLessonAction,
  'complete-lesson': lessons.completeLessonAction,
  'delete-lesson': lessons.deleteLessonAction,
};
export async function executeAcademyMutation(operation: AcademyMutationOperation, form: FormData) {
  let result;
  try { result = await handlers[operation](form); }
  catch (error) { if (error instanceof ZodError) throw new AcademyOperationError(error.issues[0]?.message ?? 'Dados inválidos.'); throw error; }
  return academyMutationOutcomeSchema.parse(result ?? {});
}
