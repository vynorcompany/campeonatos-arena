import "server-only";
import * as actions from "./comanda-actions";
import { comandaOutcomeSchema, type ComandaOperation } from "@/lib/backend/contracts/comanda";
const operations = {
  create: actions.createComandaAction, delete: actions.deleteComandaAction, "open-bookings": actions.openBookingComandasAction,
  "add-product": actions.addComandaProductAction, "item-quantity": actions.updateComandaItemQuantityAction, "item-edit": actions.editComandaItemAction,
  finish: actions.finishComandaAction, "portal-open": actions.requestPortalComandaOpenAction, "portal-close": actions.requestPortalComandaCloseAction,
  "portal-product": actions.requestPortalComandaProductAction, "portal-order": actions.requestPortalComandaOrderAction, "confirm-request": actions.confirmPortalComandaRequestAction,
};
export async function executeComandaMutation(operation: ComandaOperation, fields: Record<string, string[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) for (const value of values) form.append(key, value);
  const result = await operations[operation](form);
  return comandaOutcomeSchema.parse({ error: result && "error" in result ? result.error ?? null : null, ...(operation === "create" && result ? { comanda: result } : {}), ...(result && "comandaIds" in result ? { comandaIds: result.comandaIds } : {}) });
}
