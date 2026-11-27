import "server-only";
import * as actions from "./public-super12-actions";
import {portalSuper12OutcomeSchema,type PortalSuper12Operation} from "../contracts/portal-super12-actions";
const operations={create:actions.createSuper12Action,score:actions.recordSuper12ScoreAction,advance:actions.advanceSuper12KnockoutAction,finish:actions.finishSuper12Action};
export async function executePortalSuper12Mutation(operation:PortalSuper12Operation,fields:Record<string,string[]>){const form=new FormData();for(const[key,values]of Object.entries(fields))for(const value of values)form.append(key,value);return portalSuper12OutcomeSchema.parse(await operations[operation](form));}
