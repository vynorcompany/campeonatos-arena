"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createWhatsAppContactAction,
  linkWhatsAppConversationToClientAction,
  markWhatsAppConversationReadAction,
  refreshWhatsAppConversationProfilePhotoAction,
  refreshWhatsAppGroupNameAction,
  sendWhatsAppAudioMessageAction,
  sendWhatsAppChatMessageAction,
  sendWhatsAppMediaMessageAction,
  updateWhatsAppConversationAction,
  updateWhatsAppSlaAction,
} from "@/lib/actions/whatsapp-chat";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { WhatsAppIcon, type WhatsAppIconName } from "./whatsapp-icons";
import { formatWhatsAppPhone, initials, type WhatsAppClient, type WhatsAppConversation, type WhatsAppFilter, type WhatsAppMessage } from "./types";
import { useAudioRecorder } from "./use-audio-recorder";
import { useWhatsAppRealtime } from "./use-whatsapp-realtime";

const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const detailTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const emojis = ["😀", "😁", "😂", "🥳", "😍", "😎", "🙏", "👍", "👋", "🎾", "🔥", "❤️"];
const filterOptions: [WhatsAppFilter, string, WhatsAppIconName][] = [["all", "Conversas", "chat"], ["unread", "Não lidas", "mail"], ["groups", "Grupos", "users"], ["favorite", "Favoritas", "heart"], ["archived", "Arquivadas", "archive"]];

type ConversationAction = "archive" | "pin" | "unread" | "favorite" | "list" | "clear" | "delete" | "resolve_sla";
type AudioDraft = { file: File; previewUrl: string };

function Avatar({ conversation, size = "" }: { conversation: WhatsAppConversation; size?: string }) {
  const source = conversation.profilePhotoUrl || conversation.player?.photoUrl;
  const [photo, setPhoto] = useState(source);

  useEffect(() => {
    setPhoto(source);
    if (source) return;
    const form = new FormData();
    form.set("conversationId", conversation.id);
    void refreshWhatsAppConversationProfilePhotoAction(form)
      .then((result) => { if (result.profilePhotoUrl) setPhoto(result.profilePhotoUrl); })
      .catch(() => {});
  }, [conversation.id, source]);

  return <i className={`whatsapp-contact-avatar ${size}`}>{photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : initials(conversation.contactName || conversation.contactPhone)}</i>;
}

export function WhatsAppChatWorkspace({ conversations, connected, clients, slaMinutes }: { conversations: WhatsAppConversation[]; connected: boolean; clients: WhatsAppClient[]; slaMinutes: number }) {
  const [activeId, setActiveId] = useState(conversations.find((item) => !item.archivedAt)?.id ?? conversations[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [filter, setFilter] = useState<WhatsAppFilter>("all");
  const [menuId, setMenuId] = useState("");
  const [showSla, setShowSla] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [linkNewClient, setLinkNewClient] = useState(false);
  const [slaValue, setSlaValue] = useState(String(slaMinutes));
  const [notice, setNotice] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [audioDraft, setAudioDraft] = useState<AudioDraft | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0] ?? null;
  const messagesFor = useCallback((conversation: WhatsAppConversation) => Array.from(new Map([
    ...conversation.messages,
    ...(localMessages[conversation.id] ?? []),
  ].map((message) => [message.id, message])).values()).sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime()), [localMessages]);
  const activeMessages = active ? messagesFor(active) : [];

  const discardAudioDraft = useCallback(() => {
    setAudioDraft((draft) => {
      if (draft) URL.revokeObjectURL(draft.previewUrl);
      return null;
    });
  }, []);
  const onRecorderError = useCallback((message: string) => setNotice(message), []);
  const onRecorderReady = useCallback((draft: AudioDraft) => {
    discardAudioDraft();
    setAudioDraft(draft);
    setNotice("Áudio anexado. Pressione Enter ou clique em Enviar para enviar.");
  }, [discardAudioDraft]);
  const { recording, level, start: startRecording, stop: stopRecording } = useAudioRecorder({ onReady: onRecorderReady, onError: onRecorderError });
  useWhatsAppRealtime({ paused: pending || recording });

  const visible = useMemo(() => conversations.filter((conversation) => {
    const searchMatches = `${conversation.contactName} ${conversation.contactPhone} ${conversation.player?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!searchMatches) return false;
    if (filter === "unread") return conversation.unreadCount > 0 && !conversation.archivedAt;
    if (filter === "groups") return conversation.remoteJid.endsWith("@g.us") && !conversation.archivedAt;
    if (filter === "favorite") return conversation.favorite && !conversation.archivedAt;
    if (filter === "archived") return Boolean(conversation.archivedAt);
    return !conversation.archivedAt;
  }), [conversations, filter, query]);
  const matchedClient = useMemo(() => active ? clients.find((client) => normalizeBrazilianPhone(client.phone) === normalizeBrazilianPhone(active.contactPhone)) ?? null : null, [active, clients]);
  const clientOptions = useMemo(() => clientQuery.trim() ? clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(clientQuery.toLowerCase())).slice(0, 8) : [], [clientQuery, clients]);

  const slaStatus = (conversation: WhatsAppConversation) => {
    const last = messagesFor(conversation).at(-1);
    if (last?.direction !== "INBOUND" || (conversation.slaResolvedAt && new Date(conversation.slaResolvedAt).getTime() >= new Date(last.sentAt).getTime())) return "normal";
    const elapsedMinutes = (Date.now() - new Date(last.sentAt || conversation.lastMessageAt).getTime()) / 60_000;
    const limit = Number(slaValue) || slaMinutes;
    return elapsedMinutes >= limit ? "overdue" : elapsedMinutes >= limit * .8 ? "warning" : "normal";
  };

  useEffect(() => {
    if (active?.unreadCount) {
      const form = new FormData();
      form.set("conversationId", active.id);
      void markWhatsAppConversationReadAction(form);
    }
  }, [active?.id, active?.unreadCount]);
  useEffect(() => { if (!activeId && visible[0]) setActiveId(visible[0].id); }, [activeId, visible]);
  useEffect(() => conversations
    .filter((conversation) => conversation.remoteJid.endsWith("@g.us") && (!conversation.contactName || conversation.contactName === "Grupo do WhatsApp"))
    .forEach((conversation) => {
      const form = new FormData();
      form.set("conversationId", conversation.id);
      void refreshWhatsAppGroupNameAction(form).then((result) => { if (result.name) window.location.reload(); }).catch(() => {});
    }), [conversations]);
  useEffect(() => () => discardAudioDraft(), [discardAudioDraft]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowContact(false); setShowSla(false); setShowEmoji(false); setSelectedImage(""); setMenuId("");
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const runConversationAction = (conversation: WhatsAppConversation, action: ConversationAction) => {
    const form = new FormData();
    form.set("conversationId", conversation.id);
    form.set("action", action);
    if (action === "list") form.set("listName", "Lista de atendimento");
    startTransition(async () => {
      try {
        await updateWhatsAppConversationAction(form);
        setMenuId("");
        setNotice(action === "delete" ? "Conversa excluída." : action === "clear" ? "Mensagens removidas da conversa." : action === "resolve_sla" ? "SLA encerrado para esta conversa." : "Conversa atualizada.");
        if (action === "delete") setActiveId("");
      } catch { setNotice("Não foi possível atualizar a conversa."); }
    });
  };
  const linkClient = (playerId: string) => {
    if (!active || !playerId) return;
    const form = new FormData(); form.set("conversationId", active.id); form.set("playerId", playerId);
    startTransition(async () => {
      try { await linkWhatsAppConversationToClientAction(form); setClientQuery(""); setNotice("Cliente vinculado à conversa."); }
      catch { setNotice("Não foi possível vincular o cliente."); }
    });
  };
  const saveSla = () => {
    const form = new FormData(); form.set("minutes", slaValue);
    startTransition(async () => {
      try { await updateWhatsAppSlaAction(form); setShowSla(false); setNotice("SLA de atendimento atualizado."); }
      catch { setNotice("Informe um SLA entre 5 minutos e 24 horas."); }
    });
  };
  const sendText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (audioDraft) { void sendAudio(); return; }
    if (!active || !body.trim()) return;
    const text = body.trim();
    const temporaryId = `local-${Date.now()}`;
    const temporary: WhatsAppMessage = { id: temporaryId, direction: "OUTBOUND", body: text, mediaType: "", mediaMimeType: "", mediaUrl: "", sentAt: new Date().toISOString() };
    const form = new FormData(); form.set("conversationId", active.id); form.set("body", text);
    setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), temporary] }));
    setBody("");
    startTransition(async () => {
      try {
        const message = await sendWhatsAppChatMessageAction(form);
        setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).map((item) => item.id === temporaryId ? message : item) }));
      } catch {
        setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).filter((item) => item.id !== temporaryId) }));
        setBody(text); setNotice("Não foi possível enviar a mensagem.");
      }
    });
  };
  const sendAudio = async () => {
    if (!active || !audioDraft) return;
    const draft = audioDraft;
    // Keep the object URL alive until the delivery succeeds. If Evolution is
    // temporarily unavailable, the person can retry the same recording.
    setAudioDraft(null);
    const form = new FormData(); form.set("conversationId", active.id); form.set("audio", draft.file);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppAudioMessageAction(form);
        setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), message] }));
        URL.revokeObjectURL(draft.previewUrl);
        setNotice("Áudio enviado.");
      } catch {
        setAudioDraft(draft);
        setNotice("Não foi possível enviar o áudio.");
      }
    });
  };
  const uploadFile = (file: File) => {
    if (!active) return;
    const form = new FormData(); form.set("conversationId", active.id); form.set("file", file);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppMediaMessageAction(form);
        setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), message] }));
      } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível enviar o anexo."); }
      finally { if (fileInput.current) fileInput.current.value = ""; }
    });
  };

  if (!connected) return <section className="whatsapp-chat-empty"><strong>Conecte o WhatsApp da arena para começar.</strong><span>O QR Code fica em Configurações › Integrações.</span></section>;

  return <section className="whatsapp-chat-workspace whatsapp-inbox">
    <aside className="whatsapp-inbox-list">
      <header><div><span>CAIXA DE ENTRADA</span><strong>Conversas</strong></div><div className="whatsapp-header-actions">
        <button type="button" title="Configurar SLA" onClick={() => setShowSla((value) => !value)}><WhatsAppIcon name="clock" /></button>
        <button type="button" title="Novo contato" onClick={() => { setLinkNewClient(false); setShowContact(true); }}><WhatsAppIcon name="plusUser" /></button>
        {showSla ? <div className="whatsapp-sla-popover"><label>Tempo de SLA <input value={slaValue} onChange={(event) => setSlaValue(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /> min</label><button type="button" onClick={saveSla} disabled={pending}>Salvar</button></div> : null}
      </div></header>
      <div className="whatsapp-filters" role="tablist" aria-label="Filtros de conversas">{filterOptions.map(([id, label, icon]) => <button key={id} type="button" className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)} title={label}><i><WhatsAppIcon name={icon} size={15} /></i><span>{label}</span></button>)}</div>
      <div className="whatsapp-list-tools"><label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone ou empresa" /></label></div>
      <div className="whatsapp-conversation-list">{visible.map((conversation) => {
        const last = messagesFor(conversation).at(-1); const status = slaStatus(conversation); const mayResolveSla = conversation.unreadCount === 0 && last?.direction === "INBOUND";
        return <div key={conversation.id} className="whatsapp-conversation-item">
          <button type="button" className={`${conversation.id === active?.id ? "is-active" : ""} ${status === "warning" ? "is-sla-warning" : ""} ${status === "overdue" ? "is-sla-overdue" : ""}`} onClick={() => { setActiveId(conversation.id); setMenuId(""); }}><Avatar conversation={conversation} /><span><strong>{conversation.contactName || conversation.player?.name || formatWhatsAppPhone(conversation.contactPhone)}{conversation.pinned ? <b className="whatsapp-pin"><WhatsAppIcon name="pin" size={12} /></b> : null}</strong><small>{last?.body || "Sem mensagens"}</small>{status !== "normal" ? <em>{status === "overdue" ? "SLA atrasado" : "SLA próximo do limite"}</em> : null}</span><time>{time(conversation.lastMessageAt)}{conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}</time></button>
          <button className="whatsapp-menu-trigger" type="button" aria-label="Ações da conversa" onClick={() => { setActiveId(conversation.id); setMenuId(menuId === conversation.id ? "" : conversation.id); }}><WhatsAppIcon name="more" /></button>
          {menuId === conversation.id ? <div className="whatsapp-conversation-menu">{mayResolveSla ? <button onClick={() => runConversationAction(conversation, "resolve_sla")}>✓ Encerrar SLA</button> : null}<button onClick={() => runConversationAction(conversation, "archive")}><WhatsAppIcon name="archive" size={14} /> {conversation.archivedAt ? "Desarquivar conversa" : "Arquivar conversa"}</button><button onClick={() => runConversationAction(conversation, "pin")}><WhatsAppIcon name="pin" size={14} /> {conversation.pinned ? "Desafixar conversa" : "Fixar conversa"}</button><button onClick={() => runConversationAction(conversation, "unread")}><WhatsAppIcon name="mail" size={14} /> Marcar como não lida</button><button onClick={() => runConversationAction(conversation, "favorite")}><WhatsAppIcon name="heart" size={14} /> {conversation.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}</button><button onClick={() => runConversationAction(conversation, "list")}><WhatsAppIcon name="chat" size={14} /> Adicionar à lista</button><hr /><button onClick={() => runConversationAction(conversation, "clear")}>◇ Limpar conversa</button><button className="is-danger" onClick={() => runConversationAction(conversation, "delete")}>× Excluir conversa</button></div> : null}
        </div>;
      })}{!visible.length ? <p>Nenhuma conversa encontrada.</p> : null}</div>
    </aside>
    <main className="whatsapp-chat-main">{active ? <>
      <header><div><Avatar conversation={active} size="is-header" /><span><strong>{active.contactName || active.player?.name || formatWhatsAppPhone(active.contactPhone)}</strong><small>{formatWhatsAppPhone(active.contactPhone)}</small></span></div></header>
      <div className="whatsapp-message-thread">{activeMessages.map((message) => <article key={message.id} className={message.direction === "OUTBOUND" ? "outbound" : "inbound"}>{message.mediaType === "IMAGE" ? <img className="whatsapp-message-image" src={`/api/whatsapp/media/${message.id}`} alt={message.body === "Imagem" ? "Imagem enviada pelo WhatsApp" : message.body} onClick={(event) => setSelectedImage(event.currentTarget.currentSrc || event.currentTarget.src)} /> : null}{message.mediaType === "AUDIO" ? <audio className="whatsapp-message-audio" controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "audio/ogg"} />Seu navegador não suporta áudio.</audio> : null}{message.mediaType === "VIDEO" ? <video className="whatsapp-message-video" controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "video/mp4"} /></video> : null}{message.mediaType === "DOCUMENT" ? <a className="whatsapp-message-document" href={`/api/whatsapp/media/${message.id}`} target="_blank" rel="noreferrer">Abrir documento</a> : null}{message.body && !["Imagem", "Áudio", "Vídeo", "Documento", "Figurinha"].includes(message.body) ? <p>{message.body}</p> : null}<time>{detailTime(message.sentAt)}</time></article>)}</div>
      <form onSubmit={sendText}>
        <input ref={fileInput} type="file" accept="image/*,.pdf" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); }} />
        <button type="button" className="whatsapp-composer-icon" title="Anexar imagem ou PDF" onClick={() => fileInput.current?.click()}><WhatsAppIcon name="paperclip" /></button>
        <button type="button" className={`whatsapp-composer-icon whatsapp-record-button ${recording ? "is-recording" : ""}`} title={recording ? "Parar gravação" : "Gravar áudio"} aria-label={recording ? "Parar gravação" : "Gravar áudio"} onClick={() => recording ? stopRecording() : void startRecording()}><WhatsAppIcon name="microphone" /></button>
        <label className="whatsapp-composer-field"><span>MENSAGEM OU LEGENDA</span>{recording ? <div className="whatsapp-recording-indicator"><i /><div className="whatsapp-recording-wave">{Array.from({ length: 18 }, (_, index) => <b key={index} style={{ transform: `scaleY(${Math.max(.22, Math.min(1.9, .22 + level * 4.5 * (.58 + (Math.sin(index * 1.7) + 1) * .16)))})` }} />)}</div><strong>Gravando áudio</strong><small>Clique no microfone para parar</small></div> : audioDraft ? <div className="whatsapp-pending-audio"><audio controls preload="metadata" src={audioDraft.previewUrl} /><button type="button" title="Remover áudio" aria-label="Remover áudio" onClick={discardAudioDraft}>×</button></div> : <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite uma mensagem..." rows={1} />}</label>
        <button type="button" className="whatsapp-composer-icon" title="Inserir emoji" onClick={() => setShowEmoji((value) => !value)}><WhatsAppIcon name="smile" /></button>
        <button className="whatsapp-send-button" disabled={pending || recording} title="Enviar mensagem"><WhatsAppIcon name="send" /></button>
        {showEmoji ? <div className="whatsapp-emoji-picker" role="dialog" aria-label="Escolha um emoji">{emojis.map((emoji) => <button key={emoji} type="button" onClick={() => { setBody((value) => `${value}${emoji}`); setShowEmoji(false); }}>{emoji}</button>)}</div> : null}
      </form>
    </> : <div className="whatsapp-chat-empty"><strong>Selecione uma conversa.</strong></div>}</main>
    <aside className="whatsapp-contact-panel">{active ? <><header><Avatar conversation={active} size="is-profile" /><strong>{active.contactName || active.player?.name || "Contato do WhatsApp"}</strong><span>Contato no WhatsApp</span></header><dl><div><dt>Telefone</dt><dd>{formatWhatsAppPhone(active.contactPhone)}</dd></div><div><dt>Cliente no sistema</dt><dd>{active.player ? active.player.name : "Não vinculado"}</dd></div>{active.player?.email ? <div><dt>E-mail</dt><dd>{active.player.email}</dd></div> : null}</dl>{!active.player ? <div className="whatsapp-link-client"><strong>{matchedClient ? "Cliente encontrado pelo telefone" : "Vincular a um cliente"}</strong><p>{matchedClient ? matchedClient.name : "Busque pelo nome ou telefone para vincular."}</p>{matchedClient ? <button type="button" className="button button-primary button-small" onClick={() => linkClient(matchedClient.id)} disabled={pending}>Vincular {matchedClient.name}</button> : <><input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Digite nome ou telefone" /><div className="whatsapp-client-options">{clientOptions.map((client) => <button key={client.id} type="button" onClick={() => linkClient(client.id)}>{client.name}<small>{formatWhatsAppPhone(client.phone)}</small></button>)}</div><button type="button" className="whatsapp-create-client" onClick={() => { setLinkNewClient(true); setShowContact(true); }}>Criar novo cliente</button></>}</div> : null}</> : null}</aside>
    {showContact ? <div className="whatsapp-contact-modal" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowContact(false); setLinkNewClient(false); } }}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { const result = await createWhatsAppContactAction(form); if (linkNewClient && active) { const link = new FormData(); link.set("conversationId", active.id); link.set("playerId", result.id); await linkWhatsAppConversationToClientAction(link); } setShowContact(false); setLinkNewClient(false); setNotice(linkNewClient ? `${result.name} foi criado e vinculado à conversa.` : `${result.name} foi adicionado aos clientes.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar o contato."); } }); }}><header><strong>{linkNewClient ? "Criar e vincular cliente" : "Novo contato"}</strong><button type="button" onClick={() => { setShowContact(false); setLinkNewClient(false); }}>×</button></header><label>Nome<input name="name" required minLength={3} defaultValue={linkNewClient ? active?.contactName : ""} placeholder="Nome completo" /></label><label>Telefone<input name="phone" required defaultValue={linkNewClient ? active?.contactPhone : ""} placeholder="(00) 00000-0000" /></label><button className="button button-primary" disabled={pending}>{linkNewClient ? "Criar e vincular" : "Adicionar contato"}</button></form></div> : null}
    {selectedImage ? <div className="whatsapp-image-lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedImage(""); }}><img src={selectedImage} alt="Imagem ampliada" /><button type="button" aria-label="Fechar imagem" onClick={() => setSelectedImage("")}>×</button></div> : null}
    {notice ? <p className="whatsapp-workspace-notice" role="status">{notice}</p> : null}
  </section>;
}
