import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import {normalizeBrazilianPhone} from "../src/lib/phone";
test("CSV mantém CNPJ separado do CPF e não duplica uma empresa pelo documento",async()=>{
 const writes:Array<Record<string,unknown>>=[];
 const tx={player:{findMany:async()=>[{phone:"42999990001",cpf:"",cnpj:"12.345.678/0001-90"}],create:async({data}:{data:Record<string,unknown>})=>{writes.push(data);return data;}}};
 const output:{importClientsAction?:(data:FormData)=>Promise<{imported:number}>}={};const require=createRequire(import.meta.url);
 vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/actions/client-management.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:output,File,require:(name:string)=>{
  if(name==="@/lib/auth/guards")return{requirePermission:async(permission:string)=>{assert.equal(permission,"players:import");return{arenaId:"arena-qa"};}};
  if(name==="@/lib/phone")return{normalizeBrazilianPhone};if(name==="next/cache")return{revalidatePath(){}};
  if(name==="@/lib/rls")return{withArenaTransaction:async(id:string,operation:(tx:unknown)=>Promise<unknown>)=>{assert.equal(id,"arena-qa");return operation(tx);}};
  return name.startsWith("@/")?{}:require(name);
 }});
 const data=new FormData();data.set("file",new File(["Nome;Telefone;CPF/CNPJ\nEmpresa existente;42999990002;12.345.678/0001-90\nEmpresa nova;42999990003;00.000.000/E08G-12\nPessoa Teste;42999990004;529.982.247-25"],"clientes.csv",{type:"text/csv"}));
 assert.equal((await output.importClientsAction!(data)).imported,2);assert.equal(writes[0].personType,"PJ");assert.equal(writes[0].cnpj,"00000000E08G12");assert.equal(writes[0].cpf,"");assert.equal(writes[1].personType,"PF");assert.equal(writes[1].cpf,"52998224725");
});
