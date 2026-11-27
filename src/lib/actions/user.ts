"use server";
import {runUserMutation} from "@/lib/arena-access/user-mutation";
import type {UserActionState} from "@/lib/backend/contracts/user-mutations";
export type {UserActionState} from "@/lib/backend/contracts/user-mutations";
export async function updateArenaUserRoleAction(form:FormData):Promise<UserActionState>{return runUserMutation('role',form);}
export async function updateArenaUserAction(form:FormData):Promise<UserActionState>{return runUserMutation('update',form);}
export async function removeArenaUserAction(form:FormData):Promise<UserActionState>{return runUserMutation('remove',form);}
export async function updateOwnProfileAction(_:UserActionState,form:FormData):Promise<UserActionState>{return runUserMutation('own-profile',form);}
export async function updateOwnPasswordAction(_:UserActionState,form:FormData):Promise<UserActionState>{return runUserMutation('own-password',form);}
