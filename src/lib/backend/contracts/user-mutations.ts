import {z} from "zod";
export const userOperations=['role','update','remove','own-profile','own-password'] as const;
export type UserOperation=typeof userOperations[number];
const role=z.enum(['OWNER','ADMIN','STAFF','VIEWER']);
const id=z.string().min(1).max(200);
const permissions=z.array(z.string().max(200)).max(512).default([]);
const inputs={
 role:z.object({userId:id,arenaRole:role}).strict(),
 update:z.object({userId:id,name:z.string().max(1000),email:z.string().max(320),arenaRole:role,permissionProfileId:z.string().max(200).default(''),viewPermissions:permissions,editPermissions:permissions,financialEntryDelete:z.string().max(32).optional()}).strict(),
 remove:z.object({userId:id}).strict(),
 'own-profile':z.object({name:z.string().max(1000)}).strict(),
 'own-password':z.object({currentPassword:z.string().max(1024),newPassword:z.string().max(1024),confirmPassword:z.string().max(1024)}).strict()
};
export function userInputSchema<T extends UserOperation>(operation:T):(typeof inputs)[T]{return inputs[operation];}
export const userMutationFields={role:['userId','arenaRole'],update:['userId','name','email','arenaRole','permissionProfileId','viewPermissions','editPermissions','financialEntryDelete'],remove:['userId'],'own-profile':['name'],'own-password':['currentPassword','newPassword','confirmPassword']} as const;
export const userOutcomeSchema=z.object({error:z.string().nullable(),success:z.string().nullable()}).strict();
export type UserActionState=z.infer<typeof userOutcomeSchema>;
