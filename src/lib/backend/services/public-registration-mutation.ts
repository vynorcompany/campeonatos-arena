import "server-only";
import {createPublicRegistrationAction} from "./public-registration";
import {publicRegistrationOutcomeSchema} from "../contracts/public-registration";
export async function executePublicRegistration(fields:Record<string,string[]>){const form=new FormData();for(const[key,values]of Object.entries(fields))for(const value of values)form.append(key,value);let committed=false;const state=await createPublicRegistrationAction({error:null,success:null},form,()=>{committed=true;});return publicRegistrationOutcomeSchema.parse({state,committed});}
