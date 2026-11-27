import { FinanceOperationError } from "@/lib/finance/action-error";
import "server-only";
import { requireArenaAccess } from "@/lib/auth/session";
import { canPerformPermission } from "@/lib/permissions";
import { financialEntryPermission, type FinancialEntryOperation } from "@/lib/finance/entry-permissions";

export function assertFinancialEntryPermission(auth: Awaited<ReturnType<typeof requireArenaAccess>>, type: string, operation: FinancialEntryOperation) {
  const key = financialEntryPermission(type, operation);
  if (!canPerformPermission(key, auth.arenaRole, auth.systemRole, auth.editPermissions)) {
    throw new FinanceOperationError("Sem permissão para executar esta ação financeira.", 403);
  }
}

export function hasUnresolvedOnlinePayment(entry: {
  onlinePaymentCanceledAt?: Date | null;
  onlinePaymentId: string;
  onlinePaymentUrl: string;
  onlinePaymentClaimMethod: string;
  onlinePaymentClaimedAt: Date | null;
  notes: string;
  onlinePaymentItems: { checkout: { status: string; mercadoPagoPaymentId: string; checkoutUrl: string } }[];
}) {
  return (!entry.onlinePaymentCanceledAt && Boolean(entry.onlinePaymentId || entry.onlinePaymentUrl || entry.onlinePaymentClaimMethod || entry.onlinePaymentClaimedAt))
    || entry.notes.includes("[MP_REVIEW:")
    || entry.onlinePaymentItems.some(({ checkout }) =>
      ["PENDING", "REVIEW", "PAID"].includes(checkout.status)
      || (checkout.status === "FAILED" && Boolean(checkout.mercadoPagoPaymentId || checkout.checkoutUrl))
    );
}
