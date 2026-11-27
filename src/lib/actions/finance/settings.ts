"use server";
import { runFinancialMutation } from "@/lib/finance/mutation";
export async function createFinancialSettingAction(form: FormData) { return runFinancialMutation('settings-create-financial-setting', form); }
export async function reconcileBankAccountBalanceAction(form: FormData) { return runFinancialMutation('settings-reconcile-bank-account-balance', form); }
export async function createProductCategoryAction(form: FormData) { return runFinancialMutation('settings-create-product-category', form); }
export async function createCouponAction(form: FormData) { return runFinancialMutation('settings-create-coupon', form); }
export async function updateCouponAction(form: FormData) { return runFinancialMutation('settings-update-coupon', form); }
export async function deleteCouponAction(form: FormData) { return runFinancialMutation('settings-delete-coupon', form); }
export async function toggleCouponActiveAction(form: FormData) { return runFinancialMutation('settings-toggle-coupon-active', form); }
export async function updateFinancialCategoryAction(form: FormData) { return runFinancialMutation('settings-update-financial-category', form); }
export async function deleteFinancialCategoryAction(form: FormData) { return runFinancialMutation('settings-delete-financial-category', form); }
export async function updateSupplierAction(form: FormData) { return runFinancialMutation('settings-update-supplier', form); }
export async function deleteSupplierAction(form: FormData) { return runFinancialMutation('settings-delete-supplier', form); }
export async function updateFiscalSettingsAction(form: FormData) { return runFinancialMutation('settings-update-fiscal-settings', form); }
export async function updateOnlinePaymentSettingsAction(form: FormData) { return runFinancialMutation('settings-update-online-payment-settings', form); }
export async function connectPaymentProviderAction(form: FormData) { return runFinancialMutation('settings-connect-payment-provider', form); }
