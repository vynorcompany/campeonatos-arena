import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
test("importar holerite exige permissão antes de abrir o arquivo e não grava a folha", async () => {
 let allowed=false, reads=0;
 const exports:{previewPayslipAction?:(form:FormData)=>Promise<unknown>}={};
 const source=readFileSync(new URL("../src/lib/actions/payroll-import.ts",import.meta.url),"utf8");
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,File,Error,require(name:string){
  if(name==="@/lib/auth/session")return {requireArenaAccess:async()=>({arenaId:"own-arena",arenaRole:"STAFF",systemRole:"USER",editPermissions:[]})};
  if(name==="@/lib/permissions")return {canPerformPermission:(permission:string)=>{assert.equal(permission,"finance:payable:create");return allowed;}};
  if(name==="@/lib/finance/payslip-file")return {readPayslipFile:async()=>{reads++;return {netCents:100};}};
  throw new Error(`Unexpected persistence or external service: ${name}`);
 }});
 const form=new FormData();form.set("file",new File(["text"],"holerite.txt"));
 await assert.rejects(exports.previewPayslipAction!(form),/Sem permissão/);assert.equal(reads,0);
 allowed=true;const preview=await exports.previewPayslipAction!(form) as {draft:{netCents:number}};assert.equal(preview.draft.netCents,100);assert.equal(reads,1);
});
