import { z } from "zod";
export const accessOperations = ["create", "update", "delete"] as const;
export type AccessOperation = typeof accessOperations[number];
const permissions = z.array(z.string().max(200)).max(512);
const values = {name:z.string().trim().min(2).max(1000), description:z.string().max(20000).default(""), viewPermissions:permissions.default([]),editPermissions:permissions.default([]),financialEntryDelete:z.string().max(32).optional()};
const inputs = {create:z.object(values).strict(),update:z.object({...values,profileId:z.string().min(1).max(200)}).strict(),delete:z.object({profileId:z.string().min(1).max(200)}).strict()};
export function accessInputSchema<T extends AccessOperation>(operation:T):(typeof inputs)[T] {return inputs[operation];}
export const accessOutcomeSchema = z.object({profileId:z.string().min(1).max(200)}).strict();
export const accessFailureSchema = z.object({error:z.string()}).strict();
const profileIdentity = z.object({id:z.string(),name:z.string()}).strict();
export const accessProfilesSchema = z.object({profiles:z.array(profileIdentity.extend({description:z.string(),members:z.array(z.object({user:z.object({name:z.string()}).strict()}).strict())}).strict())}).strict();
export const accessProfileSchema = profileIdentity.extend({description:z.string(),viewPermissions:permissions,editPermissions:permissions,_count:z.object({members:z.number().int().min(0)}).strict()}).strict().nullable();
export const accessUsersSchema = z.object({members:z.array(z.object({id:z.string(),userId:z.string(),role:z.string(),permissionProfileId:z.string().nullable(),viewPermissions:permissions,editPermissions:permissions,user:z.object({name:z.string(),email:z.string()}).strict(),permissionProfile:profileIdentity.nullable()}).strict()),profiles:z.array(profileIdentity),invites:z.array(z.object({id:z.string(),email:z.string(),name:z.string(),expiresAt:z.iso.datetime()}).strict()).max(50)}).strict();
export function canManageAccess(auth:{systemRole:string;arenaRole:string|null}) {return ["SUPER_ADMIN","ADMIN"].includes(auth.systemRole)||["ADMIN","OWNER"].includes(auth.arenaRole??"");}
