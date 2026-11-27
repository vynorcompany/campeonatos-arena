import "server-only";
import {recordOwnEventMatchResultAction,recordOwnTrioGameResultAction} from "./public-event-results";
import {eventResultOutcomeSchema,type EventResultOperation} from "../contracts/event-results";
export async function executeEventResultMutation(operation:EventResultOperation,fields:Record<string,string[]>){const form=new FormData();for(const[key,values]of Object.entries(fields))for(const value of values)form.append(key,value);return eventResultOutcomeSchema.parse(await(operation==="trio"?recordOwnTrioGameResultAction(form):recordOwnEventMatchResultAction(form)));}
