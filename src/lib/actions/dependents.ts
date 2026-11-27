"use server";
import {runClientMutation} from "@/lib/clients/mutation";
export async function createDependentAction(form:FormData){try{const result=await runClientMutation("dependent",form);return result.error?{error:result.error}:{success:true as const};}catch{return{error:"Não foi possível cadastrar o dependente. Confira os dados e tente novamente."};}}
