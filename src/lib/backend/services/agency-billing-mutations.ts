import "server-only";
import * as actions from "./agency-billing-actions";
import { agencyBillingOutcomeSchema, type AgencyBillingOperation } from "../contracts/agency-billing";
const operations = { plan: actions.saveAgencyPlanAction, assign: actions.assignAgencyPlanAction, status: actions.setAgencySubscriptionStatusAction, checkout: actions.prepareAgencyInvoiceAction, grace: actions.saveAgencyBillingGraceAction };
export async function executeAgencyBillingMutation(operation: AgencyBillingOperation, input: Record<string, string>) {
  const form = new FormData(); for (const [key, value] of Object.entries(input)) form.set(key, value);
  let changed = false;
  try {
    const result = await operations[operation](form, () => { changed = true; });
    return agencyBillingOutcomeSchema.parse({ error: result?.error ?? null, changed });
  } catch (error) {
    if (error instanceof actions.AgencyBillingOperationError) return agencyBillingOutcomeSchema.parse({ error: error.message, changed });
    throw error;
  }
}
