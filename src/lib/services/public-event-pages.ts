import "server-only";
import {backendOrigin} from "@/lib/backend/http-client";
import {publicEventPageSchema,publicEventReceiptSchema,publicEventPageQuerySchema,publicEventPageSchemas,type PublicEventPageView} from "@/lib/backend/contracts/public-event-pages";
async function readPublicEventPage(view:PublicEventPageView,input:{slug:string;registrationId?:string}){try{
 const query=publicEventPageQuerySchema(view).parse(input),origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin){const local=await import("@/lib/backend/services/public-event-pages");return view==="page"?local.resolvePublicEventPage(query.slug):local.resolvePublicEventReceipt(query.slug,query.registrationId!);}
 const response=await fetch(new URL(`/api/portal/event-pages/${view}?${new URLSearchParams(query)}`,backendOrigin(origin)),{headers:{Accept:"application/json"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error("Não foi possível consultar o evento.");return publicEventPageSchemas[view].parse(await response.json());
}catch{throw Error("Não foi possível consultar o evento.");}}
export async function getPublicRegistrationPage(slug:string){const data=publicEventPageSchema.parse(await readPublicEventPage("page",{slug}));return data?{...data,earlyDiscountUntil:data.earlyDiscountUntil?new Date(data.earlyDiscountUntil):null}:null;}
export async function getPublicRegistrationReceipt(slug:string,registrationId:string){const data=publicEventReceiptSchema.parse(await readPublicEventPage("receipt",{slug,registrationId}));return data?{...data,holdExpiresAt:data.holdExpiresAt?new Date(data.holdExpiresAt):null}:null;}
