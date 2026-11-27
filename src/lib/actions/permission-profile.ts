"use server";
import {runAccessMutation} from "@/lib/arena-access/mutation";
export async function createPermissionProfileAction(form:FormData) {return runAccessMutation('create',form);}
export async function updatePermissionProfileAction(form:FormData) {return runAccessMutation('update',form);}
export async function deletePermissionProfileAction(form:FormData) {return runAccessMutation('delete',form);}
