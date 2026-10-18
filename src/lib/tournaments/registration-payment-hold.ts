import type { ArenaTransaction } from "@/lib/rls";

export const PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES = 60;

export function publicRegistrationPaymentExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES * 60_000);
}

// Mercado Pago requires at least 30 minutes of Pix validity when the request
// reaches it, including when payment starts near the end of the one-hour hold.
export function publicRegistrationPixExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + (PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES + 35) * 60_000);
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
