import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {createRequire} from "node:module";
import ts from "typescript";
const source=readFileSync("src/lib/actions/smart-lookup.ts","utf8");
function lookup({existing=null,arena="arena-a"}:{existing?:any;arena?:string}={}){
 const permissions:string[]=[],writes:any[]=[],queries:any[]=[];
 const tx:any={$executeRaw:async()=>1};
 for(const model of ["supplier","productCategory","financialCategory"]){tx[model]={findFirst:async(q:any)=>{queries.push(q);return existing;},create:async(q:any)=>{writes.push(q);return{id:"created",...q.data};}};}
 const exports:any={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,require:(name:string)=>{
 if(name==="@/lib/auth/guards")return{requirePermission:async(p:string)=>{permissions.push(p);return{arenaId:arena};},requireModuleEdit:async(p:string)=>{permissions.push(p);return{arenaId:arena};}};
 if(name==="@/lib/rls")return{withArenaTransaction:async(id:string,fn:any)=>{assert.equal(id,arena);return fn(tx);}};
 if(name==="@/lib/actions/calendar")return{createQuickPlayerAction:async()=>{permissions.push("players:create delegate");return{id:"client",name:"Cliente QA"};}};
 throw new Error(name);
 }});
 return{run:async(kind:string,name="Categoria QA",type="REVENUE")=>{const f=new FormData();f.set("kind",kind);f.set("name",name);f.set("financeType",type);return exports.createSmartLookupAction(f);},permissions,writes,queries};
}
test("cadastro inteligente usa a arena autenticada e permissões específicas",async()=>{
 const service=lookup();await service.run("product-category");assert.deepEqual(service.permissions,["stock"]);assert.equal(service.writes[0].data.arenaId,"arena-a");
 const supplier=lookup();await supplier.run("supplier");assert.deepEqual(supplier.permissions,["finance:settings:manage"]);assert.equal(supplier.writes[0].data.arenaId,"arena-a");
 const client=lookup();await client.run("client");assert.deepEqual(client.permissions,["players:create delegate"]);
});
test("cadastro reutiliza categoria existente sem duplicar e valida seu tipo",async()=>{
 const service=lookup({existing:{id:"existing",name:"Categoria QA",active:true,type:"REVENUE"}});assert.equal((await service.run("financial-category")).id,"existing");assert.equal(service.writes.length,0);assert.equal(service.queries[0].where.arenaId,"arena-a");
 assert.match((await service.run("financial-category","Categoria QA","EXPENSE")).error,/outro tipo/);
});
test("não recria fornecedor inativo e rejeita nome incompleto",async()=>{
 const service=lookup({existing:{id:"inactive",name:"Fornecedor QA",active:false}});assert.match((await service.run("supplier")).error,/inativo/);assert.equal(service.writes.length,0);
 const invalid=lookup();assert.match((await invalid.run("supplier","A")).error,/nome/);assert.equal(invalid.permissions.length,0);
});
test("seletor preserva valor canônico, busca acentos e criação em modal sem sair do formulário",()=>{
 const ui=readFileSync("src/components/forms/smart-entity-select.tsx","utf8");
 assert.match(ui,/role="combobox"/);assert.match(ui,/role="listbox"/);assert.match(ui,/select\.dispatchEvent/);assert.match(ui,/normalize\("NFD"\)/);assert.match(ui,/createSmartLookupAction\(form\)/);assert.match(ui,/createPortal/);assert.match(ui,/e\.stopPropagation\(\)/);
 const plan=readFileSync("src/components/sponsorship/fixed-court-enrollment.tsx","utf8");assert.match(plan,/<SmartEntitySelect createKind="client"/);assert.match(plan,/name="paymentMethod" required/);
});
test("seletor mantém a primeira opção implícita e valores controlados sem trocar o identificador",async()=>{
 const require=createRequire(import.meta.url);
 const React=await import("react");const {renderToStaticMarkup}=await import("react-dom/server");const exports:any={};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/components/forms/smart-entity-select.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(name:string)=>{
 if(name==="next/navigation")return{useRouter:()=>({refresh(){}})};
 if(name==="@/components/ui/modal")return{Modal:()=>null};
 if(name==="@/components/ui/operational-workspace")return{operationalWorkspace:{}};
 if(name==="@/lib/actions/smart-lookup")return{};
 return require(name);
 }});
 const options=[React.createElement("option",{key:"a",value:"id-a"},"Categoria A"),React.createElement("option",{key:"b",value:"id-b"},"Categoria B")];
 const initial=renderToStaticMarkup(React.createElement(exports.SmartEntitySelect,{name:"categoryId"},options));
 assert.match(initial,/value="Categoria A"/);assert.match(initial,/value="id-a" selected/);
 const controlled=renderToStaticMarkup(React.createElement(exports.SmartEntitySelect,{name:"categoryId",value:"id-b"},options));
 assert.match(controlled,/value="Categoria B"/);assert.match(controlled,/value="id-b" selected/);
});
