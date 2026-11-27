"use server";
import {runPortalSuper12Mutation} from "@/lib/portal/super12-mutation";
export async function createSuper12Action(form:FormData){return runPortalSuper12Mutation("create",form);}
export async function recordSuper12ScoreAction(form:FormData){return runPortalSuper12Mutation("score",form);}
export async function advanceSuper12KnockoutAction(form:FormData){return runPortalSuper12Mutation("advance",form);}
export async function finishSuper12Action(form:FormData){return runPortalSuper12Mutation("finish",form);}
