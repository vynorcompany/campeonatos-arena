import type { ArenaTransaction } from "@/lib/rls";

export const PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES = 60;

export function publicRegistrationPaymentExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES * 60_000);
}

// The Pix and the reserved slot must have the same deadline. Payment creation
// starts immediately after the registration transaction, leaving well over
// Mercado Pago's 30-minute minimum validity within the one-hour hold.
export function publicRegistrationPixExpiresAt(createdAt: Date) {
  return publicRegistrationPaymentExpiresAt(createdAt);
}

export function publicRegistrationApprovalAfterHold(
  holdExpiresAt: Date | null,
  providerApprovedAt: unknown,
  observedAt = new Date(),
) {
  if (!holdExpiresAt) return false; // Legacy registrations did not reserve a timed slot.
  const parsed = typeof providerApprovedAt === "string" ? new Date(providerApprovedAt) : null;
  const approvedAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : observedAt;
  return approvedAt >= holdExpiresAt;
}

/** Release only unpaid, timed-out registrations; paid or review records remain untouched. */
export async function releaseExpiredPublicRegistrationHolds(
  tx: ArenaTransaction,
  tournamentId: string,
  now = new Date(),
) {
  return tx.publicTournamentRegistration.updateMany({
    where: {
      tournamentId,
      status: "PENDING_PAYMENT",
      paymentStatus: { notIn: ["PAID", "REVIEW", "REFUNDED"] },
      holdExpiresAt: { lte: now },
    },
    data: { status: "CANCELED" },
  });
}
