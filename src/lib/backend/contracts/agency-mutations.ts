import {z} from "zod";
export const agencyFields={
 'whatsapp-connect':['arenaId'],'whatsapp-status':['arenaId'],'whatsapp-reset':['arenaId'],'whatsapp-qr':['arenaId'],
 'system-role':['userId','systemRole'],
 'arena-update':['arenaId','name','legalName','cnpj','email','phone','city','state','agencyNotes'],
 'arena-status':['arenaId','accountStatus'],'arena-archive':['arenaId','confirmation']
} as const;
export type AgencyOperation=keyof typeof agencyFields;
export function agencyInputSchema(operation:AgencyOperation){return z.record(z.string(),z.string().max(4096)).superRefine((value,ctx)=>{for(const key of Object.keys(value))if(!(agencyFields[operation] as readonly string[]).includes(key))ctx.addIssue({code:'custom',message:'Campo inesperado',path:[key]});if(operation==='system-role'&&!['SUPER_ADMIN','ADMIN','MANAGER','VIEWER'].includes(value.systemRole))ctx.addIssue({code:'custom',message:'Papel inválido',path:['systemRole']});if(operation==='arena-status'&&!['ACTIVE','PAUSED','CANCELED'].includes(value.accountStatus))ctx.addIssue({code:'custom',message:'Status inválido',path:['accountStatus']});const id=operation==='system-role'?'userId':'arenaId';if(!value[id]?.trim()||value[id].length>200)ctx.addIssue({code:'custom',message:'Identificação inválida',path:[id]});});}
export const agencyOutcomeSchema=z.object({error:z.string().nullable(),connected:z.boolean().optional()}).strict();
export const agencyOperations=Object.keys(agencyFields) as AgencyOperation[];
export function isAgencySystemRole(role:string){return ['SUPER_ADMIN','ADMIN','MANAGER'].includes(role);}

export const agencyUsersSchema=z.object({users:z.array(z.object({id:z.string(),name:z.string(),email:z.string(),systemRole:z.string(),memberships:z.array(z.object({id:z.string(),role:z.string(),arena:z.object({name:z.string()}).strict()}).strict())}).strict())}).strict();
export const agencyArenasSchema=z.object({arenas:z.array(z.object({id:z.string(),name:z.string(),slug:z.string(),legalName:z.string(),cnpj:z.string(),email:z.string(),phone:z.string(),city:z.string(),state:z.string(),agencyNotes:z.string(),accountStatus:z.string(),archivedAt:z.iso.datetime().nullable(),_count:z.object({members:z.number().int().min(0),supportTickets:z.number().int().min(0)}).strict()}).strict())}).strict();
