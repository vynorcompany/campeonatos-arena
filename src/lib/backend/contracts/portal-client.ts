import {z} from "zod";
const text=z.string(), integer=z.number().int();
export const portalClientQuerySchema=z.object({arenaSlug:text.trim().min(1).max(160),catalog:z.enum(["true","false"]).optional()}).strict();
export const portalClientViews=["home","finance","comandas"] as const;
export type PortalClientView=typeof portalClientViews[number];
const urgency=z.enum(["normal","soon","overdue"]);
export const portalHomeSchema=z.object({
 financialVisible:z.boolean(),
 announcements:z.array(z.object({id:text,title:text,message:text,pinned:z.boolean(),linkUrl:text}).strict()),
 events:z.array(z.object({id:text,title:text,notes:text,scheduledAt:z.iso.datetime(),when:text}).strict()),
 eventPosts:z.array(z.object({id:text,title:text,caption:text,imageUrl:text,linkUrl:text.nullable(),pinned:z.boolean()}).strict()),
 charges:z.array(z.object({id:text,description:text,amount:text,dueDate:text,paymentUrl:text,urgency}).strict()),
 upcomingReservations:z.array(z.object({id:text,title:text,when:text,courtName:text}).strict()),
 summary:z.object({financial:text,futureFinancial:text.nullable(),financialStatus:text,mobileFinancialStatus:z.enum(["overdue","soon","healthy"]),mobileFinancialLabel:text,classes:integer,reservations:integer,leagues:integer}).strict(),
}).strict().nullable();
const financeRow=z.object({id:text,description:text,detail:text,amountCents:integer,amount:text,dueDate:text,paidAt:text,status:text,urgency,hasCharge:z.boolean(),paymentUrl:text}).strict();
export const portalFinanceSchema=z.object({disabled:z.boolean(),paymentEnabled:z.boolean(),health:text,headline:text,detail:text,overdue:z.array(financeRow),open:z.array(financeRow),paid:z.array(financeRow),comandas:z.array(z.object({id:text,code:text,amount:text}).strict())}).strict().nullable();
const compositionOption=z.object({productId:text,name:text,quantity:integer,available:z.boolean()}).strict();
const composition=z.object({fixed:z.array(compositionOption),groups:z.array(z.object({id:text,label:text,options:z.array(compositionOption)}).strict())}).strict();
const bookingService=z.object({id:text,name:text,date:text,amountCents:integer,chargedAmountCents:integer,state:text,financialEntryId:text.nullable()}).strict();
export const portalComandasSchema=z.object({disabled:z.boolean(),
 comandas:z.array(z.object({id:text,code:text,closeRequestedAt:z.iso.datetime().nullable(),openedAt:text,openedBy:text,bookingServices:z.array(bookingService),totalCents:integer,items:z.array(z.object({id:text,name:text,quantity:integer,totalCents:integer}).strict())}).strict()),
 categories:z.array(z.object({id:text,name:text}).strict()),
 products:z.array(z.object({id:text,name:text,priceCents:integer,stockQuantity:integer,category:text,composition}).strict()),
}).strict().nullable();
export const portalClientResponses={home:portalHomeSchema,finance:portalFinanceSchema,comandas:portalComandasSchema} as const;
