import{z}from"zod";
const slug=z.string().trim().min(1).max(160);
export const portalSupportQueries={
 occupancy:z.object({arenaSlug:slug,date:z.string().max(32).optional()}).strict(),
 'booking-payment':z.object({arenaSlug:slug,occurrenceId:z.string().min(1).max(160)}).strict(),
 legal:z.object({arenaSlug:slug}).strict(),
 cancellation:z.object({arenaSlug:slug}).strict(),
 'privacy-requests':z.object({arenaSlug:slug}).strict(),
 alias:z.object({arenaSlug:slug}).strict(),
 'charge-link':z.object({arenaSlug:slug,entryId:z.string().min(1).max(160)}).strict(),
}as const;
export type PortalSupportView=keyof typeof portalSupportQueries;
export const portalOccupancySchema=z.object({selectedDate:z.string(),previousDate:z.string(),nextDate:z.string(),onlineBookingEnabled:z.boolean(),courts:z.array(z.object({id:z.string(),name:z.string()}).strict()),rows:z.array(z.object({minute:z.number().int(),label:z.string(),states:z.array(z.enum(["OCCUPIED","FREE","UNAVAILABLE"]))}).strict())}).strict().refine(data=>data.rows.every(row=>row.states.length===data.courts.length)).nullable();
export const bookingPaymentSummarySchema=z.object({holdExpiresAt:z.iso.datetime(),summary:z.object({court:z.string(),dateTime:z.string(),duration:z.number().int(),amountCents:z.number().int(),services:z.array(z.object({serviceName:z.string(),priceCents:z.number().int()}).strict())}).strict()}).strict().nullable();
export const legalArenaSchema=z.object({name:z.string(),slug:z.string(),legalName:z.string(),cnpj:z.string(),email:z.string(),phone:z.string(),address:z.string(),city:z.string(),state:z.string(),zipCode:z.string()}).strict();
export const legalArenaContextSchema=z.object({arena:legalArenaSchema.nullable(),canonicalSlug:z.string().nullable()}).strict();
export const cancellationPolicySchema=z.object({text:z.string(),updatedAt:z.iso.datetime().nullable()}).strict().nullable();
export const ownPrivacyRequestsSchema=z.object({authenticated:z.boolean(),requests:z.array(z.object({id:z.string(),kind:z.string(),status:z.string(),createdAt:z.iso.datetime(),response:z.string()}).strict()).max(100)}).strict();
export const portalAliasSchema=z.object({canonicalSlug:z.string().nullable()}).strict();
export const safePortalUrl=z.string().max(8192).refine(value=>{if(/[\\\r\n]/.test(value))return false;if(value.startsWith("/")&&!value.startsWith("//"))return true;try{const url=new URL(value);return["https:","http:"].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}});
export const ownChargeLinkSchema=z.discriminatedUnion("status",[z.object({status:z.literal("LOGIN")}).strict(),z.object({status:z.literal("MISSING")}).strict(),z.object({status:z.literal("READY"),url:safePortalUrl}).strict()]);
