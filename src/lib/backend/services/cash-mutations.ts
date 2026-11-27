import 'server-only';
import { openCashRegisterAction, createCashMovementAction, closeCashRegisterAction } from '@/lib/backend/services/cash-register';
import { cashMutationOutcomeSchema, type CashMutation } from '@/lib/backend/contracts/cash-register';
const handlers = { open: openCashRegisterAction, movement: createCashMovementAction, close: closeCashRegisterAction };
export async function executeCashMutation(operation: CashMutation, form: FormData) { await handlers[operation](form); return cashMutationOutcomeSchema.parse({}); }
