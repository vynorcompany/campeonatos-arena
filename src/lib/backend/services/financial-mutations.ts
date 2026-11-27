import 'server-only';
import * as actions from '@/lib/backend/services/financial-actions';
import { financialMutationOutcomeSchema, type FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
const handlers = {
  'create': actions.createFinancialEntryAction,
  'update': actions.updateFinancialEntryAction,
  'recurrence': actions.createFinancialRecurrenceAction,
  'charge': actions.generateFinancialEntryOnlineChargeAction,
  'settle': actions.settleFinancialEntryAction,
  'settle-bulk': actions.settleFinancialEntriesBulkAction,
  'void': actions.voidFinancialEntryAction,
  'delete': actions.deleteFinancialEntryAction,
  'delete-bulk': actions.deleteFinancialEntriesBulkAction,
  'split-card': actions.splitFinancialEntryCardAction,
} as const;
export async function executeFinancialMutation(operation: FinancialMutationOperation, form: FormData) {
  return financialMutationOutcomeSchema.parse(await handlers[operation](form) ?? {});
}
