import 'server-only';
import * as billing from '@/lib/backend/services/teacher-plan-billing';
import { teacherBillingOutcomeSchema, type TeacherBillingOperation } from '@/lib/backend/contracts/teacher-plan-billing';
const handlers = { preview: billing.previewPlanTransferAction, transfer: billing.transferStudentPlanAction, schedule: billing.schedulePlanPriceChangeAction, cancel: billing.cancelPlanPriceChangeAction };
export async function executeTeacherBilling(operation: TeacherBillingOperation, form: FormData) {
  return teacherBillingOutcomeSchema(operation).parse(await handlers[operation](form));
}
