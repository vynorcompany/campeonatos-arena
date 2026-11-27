import { z } from 'zod';
export const clientLoyaltyQuerySchema = z.object({ playerId: z.string().trim().min(1).max(256) }).strict();
export const clientLoyaltySchema = z.object({
  player: z.object({ id: z.string(), name: z.string(), active: z.boolean() }).strict(),
  settings: z.object({ loyaltyEnabled: z.boolean(), loyaltyStartedAt: z.string().datetime().nullable(), loyaltyVisitsRequired: z.number().int(), loyaltyRewardLabel: z.string() }).strict(),
  completedReservations: z.number().int(), manualVisits: z.number().int(), redeemedVisits: z.number().int(), availableVisits: z.number().int().nonnegative(), availableRewards: z.number().int().nonnegative(),
  activities: z.array(z.object({ id: z.string(), kind: z.string(), visitsDelta: z.number().int(), rewardLabel: z.string(), notes: z.string(), fulfilledAt: z.string().datetime().nullable(), createdAt: z.string().datetime() }).strict()).max(30),
}).strict();
