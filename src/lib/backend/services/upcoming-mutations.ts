import "server-only";
import * as actions from "./upcoming-actions";
import {upcomingOutcomeSchema,type UpcomingOperation}from"../contracts/upcoming";
const operations={"manual-create":actions.createManualUpcomingMatchAction,"manual-update":actions.updateManualUpcomingMatchAction,"manual-delete":actions.deleteManualUpcomingMatchAction,"settings":actions.upsertTvPresentationSettingsAction,"sponsor-create":actions.createTvSponsorAction,"plan-create":actions.createSponsorshipPlanAction,"plan-insert-sponsor":actions.insertSponsorInPlanAction,"plan-delete":actions.deleteSponsorshipPlanAction,"sponsor-update":actions.updateTvSponsorAction,"sponsor-delete":actions.deleteTvSponsorAction};
export async function executeUpcomingMutation(operation:UpcomingOperation,input:{fields:Record<string,string[]>;file?:{name:string;type:string;base64:string}}){
 const form=new FormData();for(const[key,values]of Object.entries(input.fields))for(const value of values)form.append(key,value);
 if(input.file)form.set("logo",new File([Buffer.from(input.file.base64,"base64")],input.file.name,{type:input.file.type}));
 const result=await operations[operation](form);return upcomingOutcomeSchema.parse({error:result&&"error"in result?result.error:null});
}
