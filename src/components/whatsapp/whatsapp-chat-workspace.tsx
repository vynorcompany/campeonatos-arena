"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./whatsapp-chat-workspace.utilities";

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
  reactToWhatsAppMessageAction,
  updateWhatsAppConversationAction,
  updateWhatsAppSlaAction,
} from "@/lib/actions/whatsapp-chat";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { WhatsAppIcon, type WhatsAppIconName } from "./whatsapp-icons";
import { formatWhatsAppPhone, whatsAppConversationName, initials, type WhatsAppClient, type WhatsAppConversation, type WhatsAppFilter, type WhatsAppMessage } from "./types";
import { useAudioRecorder } from "./use-audio-recorder";
import { useWhatsAppRealtime } from "./use-whatsapp-realtime";
import { WhatsAppMessageBubble } from "./whatsapp-message-bubble";

const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const emojis = ["😀", "😁", "😂", "🥳", "😍", "😎", "🙏", "👍", "👋", "🎾", "🔥", "❤️"];
const filterOptions: [WhatsAppFilter, string, WhatsAppIconName][] = [["all", "Conversas", "chat"], ["unread", "Não lidas", "mail"], ["groups", "Grupos", "users"], ["favorite", "Favoritas", "heart"], ["archived", "Arquivadas", "archive"]];

type ConversationAction = "archive" | "pin" | "unread" | "favorite" | "list" | "clear" | "delete" | "resolve_sla";
type AudioDraft = { file: File; previewUrl: string };

function Avatar({ conversation, size = "", onExpand, withinButton = false }: { conversation: WhatsAppConversation; size?: string; onExpand?: (url: string) => void; withinButton?: boolean }) {
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

  return <i className={cx(`${viewStyles.whatsapp_contact_avatar} ${size}`)}>{photo ? <img className={cx(onExpand ? "whatsapp-photo-expandable" : undefined)} src={photo} alt={`Foto de ${conversation.contactName || "contato"}`} referrerPolicy="no-referrer" role={onExpand && !withinButton ? "button" : undefined} tabIndex={onExpand && !withinButton ? 0 : undefined} aria-label={onExpand && !withinButton ? "Ampliar foto do contato" : undefined} onClick={(event) => { event.stopPropagation(); onExpand?.(photo); }} onKeyDown={(event) => { if (onExpand && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); onExpand(photo); } }} /> : initials(conversation.contactName || conversation.contactPhone)}</i>;
}

export function WhatsAppChatWorkspace({ conversations: initialConversations, connected, clients, slaMinutes, initialVersion, currentUserName = "", currentAccountJid = "" }: { currentAccountJid?: string; currentUserName?: string; conversations: WhatsAppConversation[]; connected: boolean; clients: WhatsAppClient[]; slaMinutes: number; initialVersion: string }) {
  const [groupNames, setGroupNames] = useState<Record<string, { name: string; previous: string }>>({});
  const requestedGroups = useRef(new Set<string>());
  const conversations = useMemo(() => initialConversations.map(conversation => {
    const resolved = groupNames[currentAccountJid + ':' + conversation.id];
    return resolved && resolved.previous === conversation.contactName ? { ...conversation, contactName: resolved.name } : conversation;
  }), [initialConversations, groupNames, currentAccountJid]);
  const [activeId, setActiveId] = useState(conversations.find((item) => !item.archivedAt)?.id ?? conversations[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [filter, setFilter] = useState<WhatsAppFilter>("all");
  const [menuId, setMenuId] = useState("");
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showSla, setShowSla] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [linkNewClient, setLinkNewClient] = useState(false);
  const [slaValue, setSlaValue] = useState(String(slaMinutes));
  const [notice, setNotice] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [audioDraft, setAudioDraft] = useState<AudioDraft | null>(null);
  const [messageMenuId, setMessageMenuId] = useState("");
  const [replyTo, setReplyTo] = useState<WhatsAppMessage | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const imageClose = useRef<HTMLButtonElement>(null);
  const conversationMenu = useRef<HTMLDivElement>(null);
  const conversationMenuTrigger = useRef<HTMLButtonElement>(null);
  const contactDetailsTrigger = useRef<HTMLButtonElement>(null);
  const contactDetailsClose = useRef<HTMLButtonElement>(null);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0] ?? null;
  const messagesFor = useCallback((conversation: WhatsAppConversation) => Array.from(new Map([
    ...conversation.messages,
    ...(localMessages[conversation.id] ?? []),
  ].map((message) => [message.id, message])).values()).sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime()), [localMessages]);
  const activeMessages = active ? messagesFor(active) : [];
  useEffect(() => {
    const storedIds = new Set(conversations.flatMap((conversation) => conversation.messages.map((message) => message.id)));
    setLocalMessages((current) => {
      let changed = false;
      const next = Object.fromEntries(Object.entries(current).map(([id, messages]) => {
        const remaining = messages.filter((message) => !storedIds.has(message.id));
        if (remaining.length !== messages.length) changed = true;
        return [id, remaining];
      }));
      return changed ? next : current;
    });
  }, [conversations]);
  useEffect(() => { setReplyTo(null); setMessageMenuId(""); }, [active?.id]);
  useEffect(() => {
    if (!selectedImage) return;
    const previous = document.activeElement as HTMLElement | null;
    imageClose.current?.focus();
    return () => previous?.focus();
  }, [selectedImage]);

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
  useWhatsAppRealtime({ paused: !connected || pending || recording, initialVersion });

  const visible = useMemo(() => conversations.filter((conversation) => {
    const searchMatches = `${conversation.contactName} ${conversation.contactPhone} ${conversation.player?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!searchMatches) return false;
    if (filter === "unread") return conversation.unreadCount > 0 && !conversation.archivedAt;
    if (filter === "groups") return conversation.remoteJid.endsWith("@g.us") && !conversation.archivedAt;
    if (filter === "favorite") return conversation.favorite && !conversation.archivedAt;
    if (filter === "archived") return Boolean(conversation.archivedAt);
    return !conversation.archivedAt;
  }), [conversations, filter, query]);
  const matchedClient = useMemo(() => active && !active.remoteJid.endsWith("@g.us") ? clients.find((client) => normalizeBrazilianPhone(client.phone) === normalizeBrazilianPhone(active.contactPhone)) ?? null : null, [active, clients]);
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
  useEffect(() => {
    if (!connected) return;
    const groups = initialConversations.filter(conversation => conversation.remoteJid.endsWith('@g.us') && !requestedGroups.current.has(currentAccountJid + ':' + conversation.id));
    groups.forEach(conversation => requestedGroups.current.add(currentAccountJid + ':' + conversation.id));
    void (async () => {
      for (const conversation of groups) {
        const form = new FormData();
        form.set('conversationId', conversation.id);
        const result = await refreshWhatsAppGroupNameAction(form).catch(() => null);
        if (result?.name) setGroupNames(current => ({ ...current, [currentAccountJid + ':' + conversation.id]: { name: result.name, previous: conversation.contactName } }));
      }
    })();
  }, [initialConversations, connected, currentAccountJid]);
  useEffect(() => () => discardAudioDraft(), [discardAudioDraft]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowContact(false); setShowSla(false); setShowEmoji(false); setSelectedImage(""); setMenuId(""); setMessageMenuId("");
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!menuId) return;
    const dismiss = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && !conversationMenu.current?.contains(target) && !conversationMenuTrigger.current?.contains(target)) setMenuId("");
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [menuId]);
  useEffect(() => {
    if (!showContactDetails) return;
    contactDetailsClose.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowContactDetails(false);
        contactDetailsTrigger.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showContactDetails]);

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
    if (pending || recording) return;
    if (audioDraft) { void sendAudio(); return; }
    if (!active || !body.trim()) return;
    const text = body.trim();
    const reply = replyTo;
    const temporaryId = `local-${Date.now()}`;
    const temporary: WhatsAppMessage = { id: temporaryId, direction: "OUTBOUND", senderName: currentUserName, body: text, quotedProviderId: reply?.id, quotedBody: reply?.body, quotedAuthor: reply?.direction === "OUTBOUND" ? reply.senderName || "Você" : active.contactName || "Contato", mediaType: "", mediaMimeType: "", mediaUrl: "", sentAt: new Date().toISOString() };
    const form = new FormData(); form.set("conversationId", active.id); form.set("body", text);
    if (reply) form.set("replyToId", reply.id);
    setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), temporary] }));
    setBody("");
    setReplyTo(null);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppChatMessageAction(form);
        setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).map((item) => item.id === temporaryId ? message : item) }));
      } catch {
        setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).filter((item) => item.id !== temporaryId) }));
        setBody(text); setReplyTo(reply); setNotice("Não foi possível enviar a mensagem.");
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
    if (replyTo) form.set("replyToId", replyTo.id);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppAudioMessageAction(form);
        setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), message] }));
        URL.revokeObjectURL(draft.previewUrl);
        setReplyTo(null);
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
    if (replyTo) form.set("replyToId", replyTo.id);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppMediaMessageAction(form);
        setReplyTo(null);
        setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), message] }));
      } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível enviar o anexo."); }
      finally { if (fileInput.current) fileInput.current.value = ""; }
    });
  };

  const reactToMessage = (message: WhatsAppMessage, emoji: string) => {
    if (!active || pending) return;
    const conversationId = active.id;
    const form = new FormData(); form.set("messageId", message.id); form.set("emoji", emoji);
    setMessageMenuId("");
    startTransition(async () => {
      try {
        const result = await reactToWhatsAppMessageAction(form);
        setLocalMessages((current) => ({ ...current, [conversationId]: [...(current[conversationId] ?? []).filter((item) => item.id !== message.id), { ...message, reactions: result.reactions }] }));
      } catch { setNotice("Não foi possível enviar a reação. Tente novamente."); }
    });
  };

  if (!connected) return <section className={viewStyles.whatsapp_chat_empty}><strong>Conecte o WhatsApp da arena para começar.</strong><span>O QR Code fica em Configurações › Integrações.</span></section>;

  return <section className={cx(viewStyles.whatsapp_chat_workspace_whatsapp_inbox, showContactDetails && active ? "has-contact-details" : undefined)}>
    <aside className={viewStyles.whatsapp_inbox_list}>
      <header><div><span>CAIXA DE ENTRADA</span><strong>Conversas</strong></div><div className={viewStyles.whatsapp_header_actions}>
        <button type="button" title="Configurar SLA" onClick={() => setShowSla((value) => !value)}><WhatsAppIcon name="clock" /></button>
        <button type="button" title="Novo contato" onClick={() => { setLinkNewClient(false); setShowContact(true); }}><WhatsAppIcon name="plusUser" /></button>
        {showSla ? <div className={viewStyles.whatsapp_sla_popover}><label>Tempo de SLA <input value={slaValue} onChange={(event) => setSlaValue(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /> min</label><button type="button" onClick={saveSla} disabled={pending}>Salvar</button></div> : null}
      </div></header>
      <div className={viewStyles.whatsapp_filters} role="tablist" aria-label="Filtros de conversas">{filterOptions.map(([id, label, icon]) => <button key={id} type="button" className={cx(filter === id ? "is-active" : "")} onClick={() => setFilter(id)} title={label}><i><WhatsAppIcon name={icon} size={15} /></i><span>{label}</span></button>)}</div>
      <div className={viewStyles.whatsapp_list_tools}><label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone ou empresa" /></label></div>
      <div className={viewStyles.whatsapp_conversation_list}>{visible.map((conversation) => {
        const last = messagesFor(conversation).at(-1); const status = slaStatus(conversation); const mayResolveSla = conversation.unreadCount === 0 && last?.direction === "INBOUND";
        return <div key={conversation.id} className={viewStyles.whatsapp_conversation_item}>
          <button type="button" className={cx(`${conversation.id === active?.id ? "is-active" : ""} ${status === "warning" ? "is-sla-warning" : ""} ${status === "overdue" ? "is-sla-overdue" : ""}`)} onClick={() => { setActiveId(conversation.id); setMenuId(""); }}><Avatar conversation={conversation} withinButton onExpand={setSelectedImage} /><span><strong>{whatsAppConversationName(conversation)}{conversation.pinned ? <b className={viewStyles.whatsapp_pin}><WhatsAppIcon name="pin" size={12} /></b> : null}</strong><small>{last?.body || "Sem mensagens"}</small>{status !== "normal" ? <em>{status === "overdue" ? "SLA atrasado" : "SLA próximo do limite"}</em> : null}</span><time>{time(conversation.lastMessageAt)}{conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}</time></button>
          <button className={viewStyles.whatsapp_menu_trigger} type="button" aria-label="Ações da conversa" aria-expanded={menuId === conversation.id} ref={menuId === conversation.id ? conversationMenuTrigger : undefined} onClick={() => { setActiveId(conversation.id); setMenuId(menuId === conversation.id ? "" : conversation.id); }}><WhatsAppIcon name="more" /></button>
          {menuId === conversation.id ? <div ref={conversationMenu} className={viewStyles.whatsapp_conversation_menu}>{mayResolveSla ? <button onClick={() => runConversationAction(conversation, "resolve_sla")}>✓ Encerrar SLA</button> : null}<button onClick={() => runConversationAction(conversation, "archive")}><WhatsAppIcon name="archive" size={14} /> {conversation.archivedAt ? "Desarquivar conversa" : "Arquivar conversa"}</button><button onClick={() => runConversationAction(conversation, "pin")}><WhatsAppIcon name="pin" size={14} /> {conversation.pinned ? "Desafixar conversa" : "Fixar conversa"}</button><button onClick={() => runConversationAction(conversation, "unread")}><WhatsAppIcon name="mail" size={14} /> Marcar como não lida</button><button onClick={() => runConversationAction(conversation, "favorite")}><WhatsAppIcon name="heart" size={14} /> {conversation.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}</button><button onClick={() => runConversationAction(conversation, "list")}><WhatsAppIcon name="chat" size={14} /> Adicionar à lista</button><hr /><button onClick={() => runConversationAction(conversation, "clear")}>◇ Limpar conversa</button><button className="is-danger" onClick={() => runConversationAction(conversation, "delete")}>× Excluir conversa</button></div> : null}
        </div>;
      })}{!visible.length ? <p>Nenhuma conversa encontrada.</p> : null}</div>
    </aside>
    <main className={viewStyles.whatsapp_chat_main}>{active ? <>
      <header><div><Avatar conversation={active} size="is-header" onExpand={setSelectedImage} /><span><strong>{whatsAppConversationName(active)}</strong><small>{active.remoteJid.endsWith("@g.us") ? "Grupo do WhatsApp" : formatWhatsAppPhone(active.contactPhone)}</small></span></div></header>
      <div className={viewStyles.whatsapp_message_thread}>{activeMessages.map((message) => <WhatsAppMessageBubble key={message.id} message={message} accountJid={currentAccountJid} pending={pending} menuOpen={messageMenuId === message.id} onMenu={() => setMessageMenuId(messageMenuId === message.id ? "" : message.id)} onReply={() => { setReplyTo(message); setMessageMenuId(""); messageInput.current?.focus(); }} onReact={(emoji) => reactToMessage(message, emoji)} onImage={setSelectedImage} />)}</div>
      <form className={viewStyles.whatsapp_composer} onSubmit={sendText} onKeyDown={(event) => {
        if (event.target instanceof HTMLTextAreaElement && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          if (!event.repeat) event.currentTarget.requestSubmit();
        }
      }}>
        {replyTo ? <div className={viewStyles.whatsapp_reply_preview}><div><strong>Respondendo a {replyTo.direction === "OUTBOUND" ? replyTo.senderName || "você" : active.contactName || "contato"}</strong><span>{replyTo.body || "Mensagem"}</span></div><button type="button" aria-label="Cancelar resposta" onClick={() => setReplyTo(null)}>×</button></div> : null}
        <input ref={fileInput} type="file" accept="image/*,.pdf" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); }} />
        <button type="button" className={viewStyles.whatsapp_composer_icon} title="Anexar imagem ou PDF" aria-label="Anexar imagem ou PDF" onClick={() => fileInput.current?.click()}><WhatsAppIcon name="paperclip" size={20} /></button>
        <button type="button" className={cx(`${viewStyles.whatsapp_composer_icon_whatsapp_record_button} ${recording ? "is-recording" : ""}`)} title={recording ? "Parar gravação" : "Gravar áudio"} aria-label={recording ? "Parar gravação" : "Gravar áudio"} onClick={() => recording ? stopRecording() : void startRecording()}><WhatsAppIcon name="microphone" /></button>
        <div className={viewStyles.whatsapp_composer_field}>{recording ? <div className={viewStyles.whatsapp_recording_indicator} role="status"><i /><div className={viewStyles.whatsapp_recording_wave}>{Array.from({ length: 18 }, (_, index) => <b key={index} style={{ transform: `scaleY(${Math.max(.22, Math.min(1.9, .22 + level * 4.5 * (.58 + (Math.sin(index * 1.7) + 1) * .16)))})` }} />)}</div><strong>Gravando áudio</strong><small>Clique no microfone para parar</small></div> : audioDraft ? <div className={viewStyles.whatsapp_pending_audio}><audio controls preload="metadata" src={audioDraft.previewUrl} /><button type="button" title="Remover áudio" aria-label="Remover áudio" onClick={discardAudioDraft}>×</button></div> : <textarea ref={messageInput} aria-label="Mensagem ou legenda" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite uma mensagem..." rows={1} />}</div>
        <button type="button" className={viewStyles.whatsapp_composer_icon} title="Inserir emoji" aria-label="Inserir emoji" onClick={() => setShowEmoji((value) => !value)}><WhatsAppIcon name="smile" size={20} /></button>
        <button className={viewStyles.whatsapp_send_button} disabled={pending || recording || (!body.trim() && !audioDraft)} title="Enviar mensagem" aria-label="Enviar mensagem"><WhatsAppIcon name="send" size={19} /></button>
        {showEmoji ? <div className={viewStyles.whatsapp_emoji_picker} role="dialog" aria-label="Escolha um emoji">{emojis.map((emoji) => <button key={emoji} type="button" onClick={() => { setBody((value) => `${value}${emoji}`); setShowEmoji(false); }}>{emoji}</button>)}</div> : null}
      </form>
    </> : <div className={viewStyles.whatsapp_chat_empty}><strong>Selecione uma conversa.</strong></div>}</main>
    {showContactDetails && active ? <aside id="whatsapp-contact-details" aria-label="Detalhes do contato" className={viewStyles.whatsapp_contact_panel}><button ref={contactDetailsClose} type="button" className={viewStyles.whatsapp_details_close} aria-label="Fechar detalhes do contato" onClick={() => { setShowContactDetails(false); contactDetailsTrigger.current?.focus(); }}>×</button><header><Avatar conversation={active} size="is-profile" onExpand={setSelectedImage} /><strong>{whatsAppConversationName(active)}</strong><span>{active.remoteJid.endsWith("@g.us") ? "Grupo do WhatsApp" : "Contato no WhatsApp"}</span></header><dl>{active.remoteJid.endsWith("@g.us") ? <div><dt>Tipo de conversa</dt><dd>Grupo</dd></div> : <><div><dt>Telefone</dt><dd>{formatWhatsAppPhone(active.contactPhone)}</dd></div><div><dt>Cliente no sistema</dt><dd>{active.player ? active.player.name : "Não vinculado"}</dd></div>{active.player?.email ? <div><dt>E-mail</dt><dd>{active.player.email}</dd></div> : null}</>}</dl>{!active.remoteJid.endsWith("@g.us") && !active.player ? <div className={viewStyles.whatsapp_link_client}><strong>{matchedClient ? "Cliente encontrado pelo telefone" : "Vincular a um cliente"}</strong><p>{matchedClient ? matchedClient.name : "Busque pelo nome ou telefone para vincular."}</p>{matchedClient ? <button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => linkClient(matchedClient.id)} disabled={pending}>Vincular {matchedClient.name}</button> : <><input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Digite nome ou telefone" /><div className={viewStyles.whatsapp_client_options}>{clientOptions.map((client) => <button key={client.id} type="button" onClick={() => linkClient(client.id)}>{client.name}<small>{formatWhatsAppPhone(client.phone)}</small></button>)}</div><button type="button" className={viewStyles.whatsapp_create_client} onClick={() => { setLinkNewClient(true); setShowContact(true); }}>Criar novo cliente</button></>}</div> : null}</aside> : null}
    <nav className={viewStyles.whatsapp_support_toolbar} aria-label="Ferramentas da conversa"><button ref={contactDetailsTrigger} type="button" title="Detalhes do contato" aria-label="Detalhes do contato" aria-controls="whatsapp-contact-details" aria-expanded={showContactDetails && Boolean(active)} disabled={!active} onClick={() => setShowContactDetails(value => !value)}><WhatsAppIcon name="user" size={20} /></button></nav>
    {showContact ? <div className={viewStyles.whatsapp_contact_modal} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowContact(false); setLinkNewClient(false); } }}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { const result = await createWhatsAppContactAction(form); if (linkNewClient && active) { const link = new FormData(); link.set("conversationId", active.id); link.set("playerId", result.id); await linkWhatsAppConversationToClientAction(link); } setShowContact(false); setLinkNewClient(false); setNotice(linkNewClient ? `${result.name} foi criado e vinculado à conversa.` : `${result.name} foi adicionado aos clientes.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar o contato."); } }); }}><header><strong>{linkNewClient ? "Criar e vincular cliente" : "Novo contato"}</strong><button type="button" onClick={() => { setShowContact(false); setLinkNewClient(false); }}>×</button></header><label>Nome<input name="name" required minLength={3} defaultValue={linkNewClient ? active?.contactName : ""} placeholder="Nome completo" /></label><label>Telefone<input name="phone" required defaultValue={linkNewClient ? active?.contactPhone : ""} placeholder="(00) 00000-0000" /></label><button className={viewStyles.button_button_primary} disabled={pending}>{linkNewClient ? "Criar e vincular" : "Adicionar contato"}</button></form></div> : null}
    {selectedImage ? <div className={viewStyles.whatsapp_image_lightbox} role="dialog" aria-modal="true" aria-label="Imagem ampliada" onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); imageClose.current?.focus(); } }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedImage(""); }}><img src={selectedImage} alt="Imagem ampliada" /><button ref={imageClose} type="button" aria-label="Fechar imagem" onClick={() => setSelectedImage("")}>×</button></div> : null}
    {notice ? <p className={viewStyles.whatsapp_workspace_notice} role="status">{notice}</p> : null}
  </section>;
}
