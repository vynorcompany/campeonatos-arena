import "server-only";
import * as actions from "./whatsapp-chat-actions";
import { whatsAppMutationOutcomeSchema, whatsAppUncertainMessage, type WhatsAppMutationOperation } from "../contracts/whatsapp-mutations";
const expected = new Set([
 "Conecte o WhatsApp da arena em Configurações > Integrações.", "A conta do WhatsApp mudou. Atualize a página.", "Cliente não encontrado nesta arena.", "Cadastre um telefone válido para este cliente.", "Sem permissão para enviar mensagens no WhatsApp.", "Sem permissão para gerenciar o WhatsApp.",
 "O WhatsApp da arena não está conectado.", "Contato inválido ou conta alterada. Atualize a lista.", "A mensagem respondida não pertence a esta conversa.", "Reação inválida.", "Mensagem não encontrada nesta conta.", "Conversa não encontrada.", "Conversa inválida.", "Gravação de áudio inválida.", "O áudio pode ter no máximo 16 MB.", "Anexo inválido.", "O anexo pode ter no máximo 16 MB.", "Envie uma imagem, PDF ou documento de texto, planilha ou apresentação.", "Selecione um cliente válido.", "Conversa ou cliente não encontrado.", "Ação de conversa inválida.", "Informe o nome do contato.", "Informe o telefone do contato.", "Escreva uma mensagem.", "A mensagem é muito longa.", "O SLA mínimo é de 5 minutos.", "O SLA máximo é de 24 horas.", "SLA inválido.", "Contato inválido.", "Dados inválidos.", "Telefone inválido para envio pelo WhatsApp", "O WhatsApp desta arena ainda não está conectado.",
]);
function safeError(error: unknown) {
 const message=error instanceof Error?error.message:"";
 const refusal=/^A Evolution recusou (?:o envio d[oa] (?:mensagem|áudio|anexo)|a reação) \((\d{3})\)/.exec(message);
 if(refusal) return Number(refusal[1])>=500 ? whatsAppUncertainMessage : `${refusal[0]}.`;
 return expected.has(message) || /^A Evolution recusou o envio da mensagem \(\d{3}\)\.$/.test(message) || /^Não foi possível buscar os contatos do WhatsApp \(\d{3}\)\.$/.test(message) ? message : whatsAppUncertainMessage;
}
const operations={"open-player":actions.openWhatsAppPlayerConversationAction,"open-contact":actions.openWhatsAppContactConversationAction,react:actions.reactToWhatsAppMessageAction,"send-text":actions.sendWhatsAppChatMessageAction,"send-audio":actions.sendWhatsAppAudioMessageAction,"send-media":actions.sendWhatsAppMediaMessageAction,read:actions.markWhatsAppConversationReadAction,"link-client":actions.linkWhatsAppConversationToClientAction,sla:actions.updateWhatsAppSlaAction,conversation:actions.updateWhatsAppConversationAction,"create-contact":actions.createWhatsAppContactAction,"profile-photo":actions.refreshWhatsAppConversationProfilePhotoAction,"group-name":actions.refreshWhatsAppGroupNameAction};
export async function executeWhatsAppMutation<T extends WhatsAppMutationOperation>(operation:T,form:FormData) {
 const paths:Array<{path:string;type?:"page"|"layout"}>=[],effects:typeof actions.defaultWhatsAppEffects={revalidatePath:(path,type)=>{paths.push({path,...(type?{type}:{})});}};
 try {
  let result=operation==="sync-contacts"?await actions.syncWhatsAppContactsAction(effects):await operations[operation as Exclude<WhatsAppMutationOperation,"sync-contacts">](form,effects);
  // Reaction JSON is untrusted provider data; expose only the two rendered fields.
  if(result && "reactions" in result) result={...result,reactions:result.reactions.map(({actorJid,emoji})=>({actorJid,emoji}))};
  return whatsAppMutationOutcomeSchema(operation).parse({result:result??null,error:null,paths});
 } catch(error) {return whatsAppMutationOutcomeSchema(operation).parse({result:null,error:safeError(error),paths});}
}
