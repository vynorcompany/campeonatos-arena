"use server";
import { runComandaMutation } from "@/lib/comandas/mutation";
export async function createComandaAction(form: FormData) {
  const result = await runComandaMutation("create", form);
  if (result.error) throw new Error(result.error);
  if (!result.comanda) throw new Error("Não foi possível confirmar a abertura. Confira as comandas antes de tentar novamente.");
  return result.comanda;
}
export async function deleteComandaAction(form: FormData) {
  const result = await runComandaMutation("delete", form);
  if (result.error) throw new Error(result.error);
}
export async function openBookingComandasAction(form: FormData) {
  const result = await runComandaMutation("open-bookings", form);
  return result.error ? { error: result.error } : { comandaIds: result.comandaIds };
}
export async function addComandaProductAction(form: FormData) {
  const result = await runComandaMutation("add-product", form);
  if (result.error) throw new Error(result.error);
}
export async function updateComandaItemQuantityAction(form: FormData) {
  const result = await runComandaMutation("item-quantity", form);
  if (result.error) throw new Error(result.error);
}
export async function editComandaItemAction(form: FormData) {
  const result = await runComandaMutation("item-edit", form);
  if (result.error) throw new Error(result.error);
}
export async function finishComandaAction(form: FormData) {
  const result = await runComandaMutation("finish", form);
  return result.error ? { error: result.error } : undefined;
}
export async function requestPortalComandaOpenAction(form: FormData) {
  const result = await runComandaMutation("portal-open", form);
  if (result.error) throw new Error(result.error);
}
export async function requestPortalComandaCloseAction(form: FormData) {
  const result = await runComandaMutation("portal-close", form);
  if (result.error) throw new Error(result.error);
}
export async function requestPortalComandaProductAction(form: FormData) {
  const result = await runComandaMutation("portal-product", form);
  if (result.error) throw new Error(result.error);
}
export async function requestPortalComandaOrderAction(form: FormData) {
  const result = await runComandaMutation("portal-order", form);
  if (result.error) throw new Error(result.error);
}
export async function confirmPortalComandaRequestAction(form: FormData) {
  const result = await runComandaMutation("confirm-request", form);
  if (result.error) throw new Error(result.error);
}
