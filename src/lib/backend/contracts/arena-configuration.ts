import {z} from "zod";
export const configurationSections=['data','portal','courts','users','profiles','integrations'] as const;
export type ConfigurationSection=typeof configurationSections[number];
export const configurationFields={
 profile:['name','legalName','cnpj','phone','email','address','city','state','zipCode'],
 'portal-settings':['showLeagues','showBooking','showReservations','showLessons','showClasses','showDoublesRadar'],
 'announcement-create':['title','message','linkUrl','startsAt','endsAt','pinned'],
 'announcement-toggle':['announcementId'],'announcement-pin':['announcementId'],'announcement-delete':['announcementId'],
 'calendar-feature':['calendarEventId'],
 'post-create':['title','caption','linkUrl'],'post-update':['eventPostId','title','caption','linkUrl'],
 'post-toggle':['eventPostId'],'post-pin':['eventPostId'],'post-delete':['eventPostId'],'post-image':['eventPostId'],
 'agent-create':['name','scopes','days'],'agent-revoke':['keyId']
} as const;
export type ConfigurationOperation=keyof typeof configurationFields;
export const configurationFileFields:Partial<Record<ConfigurationOperation,string>>={profile:'logo','portal-settings':'athletePortalLogo','post-create':'image','post-image':'image'};
export function configurationFileLimit(operation:ConfigurationOperation){return operation==='profile'||operation==='portal-settings'?500*1024:operation==='post-create'||operation==='post-image'?25*1024*1024:0;}
export function configurationBodyLimit(operation:ConfigurationOperation){return configurationFileLimit(operation)?Math.ceil(configurationFileLimit(operation)*4/3)+256*1024:256*1024;}
export function configurationInputSchema(operation:ConfigurationOperation){
 const size=configurationFileLimit(operation);
 return z.object({fields:z.record(z.string(),z.array(z.string().max(65536)).min(1).max(operation==='agent-create'?64:1)),file:z.object({name:z.string().max(255),type:z.string().max(120),base64:z.string().max(Math.ceil(size/3)*4).refine(value=>value.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(value))}).strict().optional()}).strict().superRefine((value,ctx)=>{
  for(const[key,values]of Object.entries(value.fields)){if(!(configurationFields[operation] as readonly string[]).includes(key))ctx.addIssue({code:'custom',message:'Campo inesperado',path:['fields',key]});if(key!=='scopes'&&values.length>1)ctx.addIssue({code:'custom',message:'Campo repetido',path:['fields',key]});}
  if(value.file&&!configurationFileFields[operation])ctx.addIssue({code:'custom',message:'Arquivo inesperado',path:['file']});
 });
}
export const configurationOutcomeSchema=z.object({error:z.string().nullable(),success:z.string().nullable(),cacheSlugs:z.array(z.string().max(200)).max(3).optional(),secret:z.string().regex(/^arena_[a-f0-9]{64}$/).optional()}).strict();
export const profileDataSchema=z.object({name:z.string(),legalName:z.string(),cnpj:z.string(),phone:z.string(),email:z.string(),address:z.string(),city:z.string(),state:z.string(),zipCode:z.string(),logoUrl:z.string()}).strict();
export const portalSettingsSchema=z.object({showLeagues:z.boolean(),showBooking:z.boolean(),showReservations:z.boolean(),showLessons:z.boolean(),showClasses:z.boolean(),showDoublesRadar:z.boolean(),portalLogoUrl:z.string()}).strict();
export const configurationDataSchema=z.object({profile:profileDataSchema.nullable(),portal:portalSettingsSchema.nullable(),connection:z.object({status:z.string(),qrCodeDataUrl:z.string(),connectedPhone:z.string(),lastError:z.string()}).strict().nullable(),announcements:z.array(z.object({id:z.string(),title:z.string(),message:z.string(),active:z.boolean(),pinned:z.boolean(),linkUrl:z.string()}).strict()),posts:z.array(z.object({id:z.string(),title:z.string(),caption:z.string(),imageUrl:z.string(),linkUrl:z.string().nullable(),active:z.boolean(),pinned:z.boolean()}).strict())}).strict();
export const agentKeysDataSchema=z.object({keys:z.array(z.object({id:z.string(),name:z.string(),prefix:z.string(),scopes:z.array(z.string()),expiresAt:z.iso.datetime(),revokedAt:z.iso.datetime().nullable(),lastUsedAt:z.iso.datetime().nullable()}).strict()).max(100)}).strict();
