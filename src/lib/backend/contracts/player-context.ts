import { z } from "zod";

const publicPlayerSchema = z.object({
  recoveryEmail: z.string().nullable(), playerId: z.string(), playerAccountId: z.string(),
  athleteIdentityId: z.string().nullable(), name: z.string(), phone: z.string(), email: z.string(),
  photoUrl: z.string(), bio: z.string(), birthDate: z.string(), gender: z.string(),
  padelCategories: z.array(z.string()), padelSide: z.string(), tournamentAvailability: z.string(),
  isTeacher: z.boolean(), arenaId: z.string(),
}).strict();
const publicIdentitySchema = z.object({
  id: z.string().nullable(), phone: z.string(), arenas: z.array(z.object({
    slug: z.string(), name: z.string(), logoUrl: z.string(), playerName: z.string(), city: z.string(), state: z.string(),
  }).strict()),
}).strict();
export const publicPlayerContextSchema = z.object({
  currentClient: publicPlayerSchema.nullable(), athleteIdentity: publicIdentitySchema.nullable(),
}).strict();
