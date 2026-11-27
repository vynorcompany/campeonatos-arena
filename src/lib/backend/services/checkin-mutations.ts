import "server-only";
import * as actions from "./checkin-actions";
import {checkinOutcomeSchema,type CheckinOperation} from "../contracts/checkin";
const operations={configure:actions.configureCourtCheckinAction,court:actions.registerCourtCheckinAction,lesson:actions.registerLessonQrCheckinAction,share:actions.shareCheckinGameAction};
export async function executeCheckinMutation(operation:CheckinOperation,fields:Record<string,string[]>) {
 const form=new FormData();for(const[key,values]of Object.entries(fields))for(const value of values)form.append(key,value);
 const result=await operations[operation](form);
 return checkinOutcomeSchema.parse({error:result&&"error"in result?result.error:null,...(result&&"path"in result?{path:result.path}:{})});
}
