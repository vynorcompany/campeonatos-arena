import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contract from "../src/lib/backend/contracts/whatsapp-mutations";
import { readBoundedMultipart } from "../src/lib/http/multipart-body";
import { RequestBodyTooLargeError } from "../src/lib/http/json-body";
import { whatsAppSendFailureMessage } from "../src/lib/whatsapp-send-feedback";
function load(file:string,deps:Record<string,unknown>,globals={}) {
 const exports:Record<string,Function>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,FormData,Error,...globals,require:(name:string)=>{if(name==='server-only')return{};assert.ok(name in deps,name);return deps[name];}});
 return exports;
}
test("WhatsApp multipart preserves bytes/filename/MIME and enforces streaming and declared limits before parse",async()=>{
 const form=new FormData();form.set('file',new File([new Uint8Array([0,1,255])],'arquivo.pdf',{type:'application/pdf'}));form.set('conversationId','own');
 const result=await readBoundedMultipart(new Request('http://example.test',{method:'POST',body:form}),1000);const file=result.get('file') as File;assert.equal(file.name,'arquivo.pdf');assert.equal(file.type,'application/pdf');assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[0,1,255]);
 let canceled=false;const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(21));},cancel(){canceled=true;}});
 const request=new Request('http://example.test',{method:'POST',body:stream,duplex:'half',headers:{'content-type':'multipart/form-data; boundary=fixture'}} as RequestInit);await assert.rejects(readBoundedMultipart(request,20),RequestBodyTooLargeError);assert.equal(canceled,true);
 const declared=new Request('http://example.test',{method:'POST',body:form,headers:{'content-length':'9999'}});await assert.rejects(readBoundedMultipart(declared,1000),RequestBodyTooLargeError);
 await assert.rejects(readBoundedMultipart(new Request('http://example.test',{method:'POST',body:'{}'}),1000),/Multipart required/);
});
test("WhatsApp operation projection rejects duplicate, forged authority and file/scalar confusion while preserving optional absence",()=>{
 const form=new FormData();form.set('conversationId','own');form.set('body','Hello');form.set('arenaId','forged');const projected=contract.projectWhatsAppMutation('send-text',form);assert.equal(projected.get('body'),'Hello');assert.equal(projected.has('replyToId'),false);assert.equal(projected.has('arenaId'),false);assert.throws(()=>contract.projectWhatsAppMutation('send-text',form,true));form.delete('arenaId');form.append('body','twice');assert.throws(()=>contract.projectWhatsAppMutation('send-text',form));
 const file=new FormData();file.set('conversationId',new File(['x'],'bad'));assert.throws(()=>contract.projectWhatsAppMutation('read',file));const audio=new FormData();audio.set('audio','not file');assert.throws(()=>contract.projectWhatsAppMutation('send-audio',audio));
 assert.equal(contract.whatsAppMutationOutcomeSchema('send-text').safeParse({result:null,error:null,paths:[]}).success,false);
 assert.equal(contract.whatsAppMutationOutcomeSchema('read').safeParse({result:null,error:null,paths:[{path:'/outside'}]}).success,false);
});
test("WhatsApp transport forwards multipart/session/Origin once, applies controlled cache effects, and never suggests retry on uncertain delivery",async()=>{
 const calls:any[]=[],paths:string[]=[];let fail=false;
 const client=load('src/lib/whatsapp/mutation.ts',{
 'next/headers':{headers:async()=>new Headers({origin:'https://frontend.test'})},'next/cache':{revalidatePath:(path:string)=>paths.push(path)},
 '@/lib/backend/http-client':{backendOrigin:(origin:string)=>new URL(origin)},'@/lib/backend/management-context-client':{managementCookieHeader:async()=>'padel_session=synthetic; padel_arena=own'},'@/lib/backend/contracts/whatsapp-mutations':contract,
 },{process:{env:{VX4_BACKEND_ORIGIN:'http://backend.test'}},URL,AbortSignal,fetch:async(url:URL,init:RequestInit)=>{calls.push({url,init});if(fail)throw Error('private token');return Response.json({result:null,error:null,paths:[{path:'/whatsapp'}]});}});
 const form=new FormData();form.set('conversationId','own');form.set('senderUserId','forged');await client.runWhatsAppMutation('read',form);
 assert.equal(calls.length,1);assert.equal(calls[0].init.body.has('senderUserId'),false);const headers=new Headers(calls[0].init.headers);assert.equal(headers.get('content-type'),null);assert.equal(headers.get('cookie'),'padel_session=synthetic; padel_arena=own');assert.equal(headers.get('origin'),'https://frontend.test');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.redirect,'error');assert.deepEqual(paths,['/whatsapp']);
 fail=true;await assert.rejects(client.runWhatsAppMutation('read',form),{message:contract.whatsAppUncertainMessage});assert.equal(calls.length,2);assert.equal(paths.length,1);assert.equal(whatsAppSendFailureMessage(new Error(contract.whatsAppUncertainMessage)),contract.whatsAppUncertainMessage);
});
test("WhatsApp dispatcher injects request-local cache effects, preserves accepted-but-unsynced and sanitizes provider/private failures",async()=>{
 let failure='',accepted=false;const actions:any={defaultWhatsAppEffects:{},sendWhatsAppChatMessageAction:async(_form:FormData,effects:any)=>{if(failure)throw Error(failure);effects.revalidatePath('/whatsapp');return accepted?{acceptedButUnsynced:true}:{id:'message',direction:'OUTBOUND',body:'Hello',senderName:'Staff',quotedProviderId:'',quotedBody:'',quotedAuthor:'',reactions:[],mediaType:'',mediaMimeType:'',mediaFileName:'',mediaUrl:'',sentAt:'2026-11-27T12:00:00Z'};}};
 const dispatcher=load('src/lib/backend/services/whatsapp-chat-mutations.ts',{'./whatsapp-chat-actions':actions,'../contracts/whatsapp-mutations':contract});
 let result=await dispatcher.executeWhatsAppMutation('send-text',new FormData());assert.equal(result.result.id,'message');assert.equal(result.paths[0].path,'/whatsapp');
 accepted=true;result=await dispatcher.executeWhatsAppMutation('send-text',new FormData());assert.equal(result.result.acceptedButUnsynced,true);
 for(const message of ['private database token','A Evolution recusou o envio do anexo (500): SECRET']){failure=message;result=await dispatcher.executeWhatsAppMutation('send-text',new FormData());assert.equal(result.result,null);assert.equal(result.error,contract.whatsAppUncertainMessage);}
 for(const message of ['A Evolution recusou o envio do anexo (400): PRIVATE_PROVIDER_DATA','A Evolution recusou o envio do anexo (400): PRIVATE\nTOKEN']){failure=message;result=await dispatcher.executeWhatsAppMutation('send-text',new FormData());assert.equal(result.error,'A Evolution recusou o envio do anexo (400).');}
});
test("all fourteen public WhatsApp bindings delegate to explicit operations and preserve connection notices",async()=>{
 const calls:string[]=[];let fail=false;
 const facade=load('src/lib/actions/whatsapp-chat.ts',{'@/lib/whatsapp/mutation':new Proxy({}, {get:()=>async(operation:string,form:FormData)=>{calls.push(operation);assert.ok(form instanceof FormData);if(fail)throw Error('private error');return operation==='open-player'?{error:'Conecte o WhatsApp da arena em Configurações > Integrações.',needsConnection:true}:{operation};}})});
 const bindings={openWhatsAppPlayerConversationAction:'open-player',syncWhatsAppContactsAction:'sync-contacts',openWhatsAppContactConversationAction:'open-contact',reactToWhatsAppMessageAction:'react',sendWhatsAppChatMessageAction:'send-text',sendWhatsAppAudioMessageAction:'send-audio',sendWhatsAppMediaMessageAction:'send-media',markWhatsAppConversationReadAction:'read',linkWhatsAppConversationToClientAction:'link-client',updateWhatsAppSlaAction:'sla',updateWhatsAppConversationAction:'conversation',createWhatsAppContactAction:'create-contact',refreshWhatsAppConversationProfilePhotoAction:'profile-photo',refreshWhatsAppGroupNameAction:'group-name'};
 for(const[name,operation]of Object.entries(bindings)){const result=await facade[name](new FormData());assert.equal(calls.at(-1),operation);if(operation==='open-player')assert.equal(result.needsConnection,true);}
 fail=true;const failed=await facade.openWhatsAppPlayerConversationAction(new FormData());assert.equal(failed.needsConnection,false);assert.equal(failed.error,'Não foi possível abrir a conversa. Atualize a página e tente novamente.');
 const source=readFileSync('src/lib/actions/whatsapp-chat.ts','utf8');assert.doesNotMatch(source,/lib\/prisma|arenaDatabase|backend\/services|integrations|withArenaTransaction/);
});
test("structured WhatsApp notices survive server-action serialization and become the exact client feedback",async()=>{
 const exports=load('src/lib/whatsapp/client-actions.ts',{'@/lib/whatsapp-send-feedback':{whatsAppUncertainMessage:contract.whatsAppUncertainMessage},'@/lib/actions/whatsapp-chat':{sendWhatsAppChatMessageAction:async()=>JSON.parse(JSON.stringify({ok:false,error:contract.whatsAppUncertainMessage}))}});
 await assert.rejects(exports.sendWhatsAppChatMessageAction(new FormData()),{message:contract.whatsAppUncertainMessage});
});

test("client request failure also returns the uncertain notice without retrying the server action",async()=>{
 let calls=0;const client=load('src/lib/whatsapp/client-actions.ts',{'@/lib/whatsapp-send-feedback':{whatsAppUncertainMessage:contract.whatsAppUncertainMessage},'@/lib/actions/whatsapp-chat':{sendWhatsAppChatMessageAction:async()=>{calls++;throw Error('Next server action transport failed');}}});
 await assert.rejects(client.sendWhatsAppChatMessageAction(new FormData()),{message:contract.whatsAppUncertainMessage});assert.equal(calls,1);
});
