import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url);
test("salvar o modo de check-in exige permissão e não reativa nem troca o QR de uma arena", async()=>{
  const writes:Record<string,unknown>[]=[];let authorized=true;
  const tx={arena:{findUniqueOrThrow:async()=>({checkinToken:"existing"}),update:async({data}:{data:Record<string,unknown>})=>{writes.push(data);}}};
  const mocks:Record<string,unknown>={"@/lib/auth/guards":{requirePermission:async(permission:string)=>{assert.equal(permission,"calendar:settings:manage");if(!authorized)throw Error("Sem permissão");return {arenaId:"own"};}},"@/lib/rls":{withArenaTransaction:async(id:string,fn:(tx:unknown)=>Promise<unknown>)=>{assert.equal(id,"own");return fn(tx);}},"next/cache":{revalidatePath(){}}};
  const exports:{configureCourtCheckinAction?:(form:FormData)=>Promise<unknown>}={};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/actions/checkin.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>mocks[name]??(name.startsWith("@/")?{}:require(name))});
  const form=new FormData();form.set("checkinMode","GROUP");form.set("enabled","true");form.set("rotate","true");
  await exports.configureCourtCheckinAction!(form);assert.deepEqual({...writes[0]},{checkinMode:"GROUP"});
  const disable=new FormData();disable.set("enabled","false");await exports.configureCourtCheckinAction!(disable);assert.deepEqual({...writes[1]},{checkinEnabled:false});
  form.set("checkinMode","INVALID");await assert.rejects(exports.configureCourtCheckinAction!(form));assert.equal(writes.length,2);
  authorized=false;form.set("checkinMode","SELF");await assert.rejects(exports.configureCourtCheckinAction!(form),/Sem permissão/);assert.equal(writes.length,2);
});
