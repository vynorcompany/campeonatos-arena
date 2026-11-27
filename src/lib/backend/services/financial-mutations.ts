import * as operationsSettings from './financial-operations-settings';
import * as portalPaymentSettings from './portal-payment-settings';
import * as comandaWhatsappSettings from './comanda-whatsapp-settings';
import * as subscriptions from '@/lib/backend/services/financial-subscriptions-actions';
import * as payroll from '@/lib/backend/services/financial-payroll-actions';
import 'server-only';
import * as settings from '@/lib/backend/services/financial-settings-actions';
import * as actions from '@/lib/backend/services/financial-actions';
import { financialMutationOutcomeSchema, type FinancialMutationOperation } from '@/lib/backend/contracts/financial-mutations';
const handlers = {
  'settings-save-financial-operations': operationsSettings.saveFinancialOperationsSettingsAction,
  'settings-save-portal-payment': portalPaymentSettings.savePortalPaymentSettingsAction,
  'settings-save-comanda-whatsapp': comandaWhatsappSettings.saveComandaWhatsappSettingsAction,
  'settings-send-pending-comanda-whatsapp': comandaWhatsappSettings.sendPendingComandaWhatsappAction,

  'academy-create-plan': subscriptions.createPlanAction,
  'academy-create-subscription': subscriptions.createSubscriptionAction,
  'academy-record-plan-payment': subscriptions.recordPlanPaymentAction,
  'payroll-create-teacher-monthly-payable': payroll.createTeacherMonthlyPayableAction,
  'payroll-upsert-payroll-entry': payroll.upsertPayrollEntryAction,

  'settings-create-financial-setting': settings.createFinancialSettingAction,
  'settings-reconcile-bank-account-balance': settings.reconcileBankAccountBalanceAction,
  'settings-create-product-category': settings.createProductCategoryAction,
  'settings-create-coupon': settings.createCouponAction,
  'settings-update-coupon': settings.updateCouponAction,
  'settings-delete-coupon': settings.deleteCouponAction,
  'settings-toggle-coupon-active': settings.toggleCouponActiveAction,
  'settings-update-financial-category': settings.updateFinancialCategoryAction,
  'settings-delete-financial-category': settings.deleteFinancialCategoryAction,
  'settings-update-supplier': settings.updateSupplierAction,
  'settings-delete-supplier': settings.deleteSupplierAction,
  'settings-update-fiscal-settings': settings.updateFiscalSettingsAction,
  'settings-update-online-payment-settings': settings.updateOnlinePaymentSettingsAction,
  'settings-connect-payment-provider': settings.connectPaymentProviderAction,

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
  const result = await handlers[operation](form);
  const nullableSettings = ['settings-save-financial-operations','settings-save-portal-payment','settings-save-comanda-whatsapp','settings-send-pending-comanda-whatsapp'].includes(operation);
  return financialMutationOutcomeSchema.parse(nullableSettings && result && 'error' in result && result.error === null ? {} : result ?? {});
}
