import{z}from"zod";
export const lookupKinds=z.enum(["client","supplier","product-category","financial-category","tournament-category"]);
export const lookupFields=["kind","name","financeType","contextId","phone","email","document","personType","cnpj","cpf","class","gender","birthDate","allowOverdueComandas"]as const;
export const lookupInputSchema=z.object({fields:z.record(z.string(),z.string().max(512))}).strict().superRefine(({fields},ctx)=>{for(const key of Object.keys(fields))if(!(lookupFields as readonly string[]).includes(key))ctx.addIssue({code:"custom",message:"Campo inválido.",path:["fields",key]});if(!lookupKinds.safeParse(fields.kind).success)ctx.addIssue({code:"custom",message:"Cadastro inválido.",path:["fields","kind"]});});
export const lookupOutcomeSchema=z.union([z.object({id:z.string().min(1),name:z.string()}).strict(),z.object({error:z.string().max(2000)}).strict()]);
export const clientRegistrationDefaultsSchema=z.object({allowOverdueComandas:z.boolean()}).strict();
