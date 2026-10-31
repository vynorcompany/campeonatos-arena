"use client";
import { AttachmentPreview } from "./attachment-preview";
import { useThreadScroll } from "./use-thread-scroll";
import { attachmentMimeType, outgoingWhatsAppMediaKind } from "@/lib/whatsapp-media-types";
import { fixedDialogFrame } from "@/components/ui/dialog-frame";

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
import { useConversationMessages } from "./use-conversation-messages";
import { shouldRefreshWhatsAppGroupName, WHATSAPP_GROUP_NAME_RETRY_MS } from "@/lib/whatsapp-group-name-retry";
import { WhatsAppMessageBubble } from "./whatsapp-message-bubble";
import { mergeWhatsAppMessages } from "./merge-messages";
import { presentWhatsAppGroupMessage } from "@/lib/whatsapp-group-message";
import { whatsAppSendFailureMessage } from "@/lib/whatsapp-send-feedback";
import { WhatsAppContactDirectory } from "./whatsapp-contact-directory";

const time = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const emojis = ["😀", "😁", "😂", "🥳", "😍", "😎", "🙏", "👍", "👋", "🎾", "🔥", "❤️"];
const filterOptions: [WhatsAppFilter, string, WhatsAppIconName][] = [["all", "Conversas", "chat"], ["unread", "Não lidas", "mail"], ["groups", "Grupos", "users"], ["favorite", "Favoritas", "heart"], ["archived", "Arquivadas", "archive"]];
const unsyncedSendNotice = "Envio aceito pelo WhatsApp, mas o histórico não atualizou. Não reenvie; atualize a conversa.";

type ConversationAction = "archive" | "pin" | "unread" | "favorite" | "list" | "clear" | "delete" | "resolve_sla";
type AttachmentDraft = { id: string; file: File; previewUrl: string; conversationId: string };
type AudioDraft = { file: File; previewUrl: string; conversationId: string };

function Avatar({ conversation, size = "", onExpand, withinButton = false }: { conversation: WhatsAppConversation; size?: string; onExpand?: (url: string) => void; withinButton?: boolean }) {
  const source = conversation.profilePhotoUrl || conversation.player?.photoUrl;
  const [photo, setPhoto] = useState(source);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let active = true;
    setPhoto(source);
    if (!source) {
      const form = new FormData();
      form.set("conversationId", conversation.id);
      void refreshWhatsAppConversationProfilePhotoAction(form)
        .then((result) => { if (active && result.profilePhotoUrl) setPhoto(result.profilePhotoUrl); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [conversation.id, source]);

  useEffect(() => {
    const image = imageRef.current;
    if (photo && image?.complete && image.naturalWidth === 0) setPhoto("");
  }, [photo]);

  return <i className={cx(`${viewStyles.whatsapp_contact_avatar} ${size}`)}>{photo ? <img ref={imageRef} className={cx(onExpand ? "whatsapp-photo-expandable" : undefined)} src={photo} alt={`Foto de ${conversation.contactName || "contato"}`} referrerPolicy="no-referrer" role={onExpand && !withinButton ? "button" : undefined} tabIndex={onExpand && !withinButton ? 0 : undefined} aria-label={onExpand && !withinButton ? "Ampliar foto do contato" : undefined} onError={() => setPhoto("")} onClick={(event) => { event.stopPropagation(); onExpand?.(photo); }} onKeyDown={(event) => { if (onExpand && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); onExpand(photo); } }} /> : initials(conversation.contactName || conversation.contactPhone)}</i>;
}

export function WhatsAppChatWorkspace({ conversations: initialConversations, pollingScope = "", connected, canEdit, canSend, clients, slaMinutes, initialVersion, selectedConversationId = "", currentUserName = "", currentAccountJid = "" }: { selectedConversationId?: string; pollingScope?: string; currentAccountJid?: string; currentUserName?: string; conversations: WhatsAppConversation[]; connected: boolean; canEdit: boolean; canSend: boolean; clients: WhatsAppClient[]; slaMinutes: number; initialVersion: string }) {
  const [groupNames, setGroupNames] = useState<Record<string, { name: string; previous: string }>>({});
  const requestedGroups = useRef(new Map<string, number>());
  const groupsInFlight = useRef(new Set<string>());
  const [groupLookupTick, setGroupLookupTick] = useState(0);
  const conversations = useMemo(() => initialConversations.map(conversation => {
    const resolved = groupNames[currentAccountJid + ':' + conversation.id];
    return resolved && resolved.previous === conversation.contactName ? { ...conversation, contactName: resolved.name } : conversation;
  }), [initialConversations, groupNames, currentAccountJid]);
  const [activeId, setActiveId] = useState(selectedConversationId || (conversations.find((item) => !item.archivedAt)?.id ?? conversations[0]?.id ?? ""));
  const requestedConversation = useRef("");
  useEffect(() => { if (selectedConversationId) { setActiveId(selectedConversationId); setMobileChatOpen(true); } }, [selectedConversationId]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const attachmentRef = useRef(attachments);
  attachmentRef.current = attachments;
  const [draggingFiles, setDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  useEffect(() => () => { attachmentRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl)); }, []);
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [filter, setFilter] = useState<WhatsAppFilter>("all");
  const [menuId, setMenuId] = useState("");
  const [showContactDetails, setShowContactDetails] = useState(false);
  const contactDetailsOpenedByUser = useRef(false);
  const [showSla, setShowSla] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [linkNewClient, setLinkNewClient] = useState(false);
  const [slaValue, setSlaValue] = useState(String(slaMinutes));
  const [notice, setNotice] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [audioDraft, setAudioDraft] = useState<AudioDraft | null>(null);
  const recordingConversationId = useRef("");
  const [messageMenuId, setMessageMenuId] = useState("");
  const [replyTo, setReplyTo] = useState<WhatsAppMessage | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const imageClose = useRef<HTMLButtonElement>(null);
  const conversationMenu = useRef<HTMLDivElement>(null);
  const conversationMenuTrigger = useRef<HTMLButtonElement>(null);
  const contactDetailsTrigger = useRef<HTMLButtonElement>(null);
  const mobileContactDetailsTrigger = useRef<HTMLButtonElement>(null);
  const contactDetailsClose = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1281px)");
    const syncDetails = () => setShowContactDetails(desktop.matches);
    syncDetails();
    desktop.addEventListener("change", syncDetails);
    return () => desktop.removeEventListener("change", syncDetails);
  }, []);

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0] ?? null;
  const replyPresentation = replyTo && active ? presentWhatsAppGroupMessage({ isGroup: active.remoteJid.endsWith("@g.us"), direction: replyTo.direction, body: replyTo.body, senderName: replyTo.senderName }) : null;
  const messageHistory = useConversationMessages(active?.id, currentAccountJid, initialVersion);
  const loadedMessages = messageHistory.messages;
  const messagesFor = useCallback((conversation: WhatsAppConversation) => mergeWhatsAppMessages(
    conversation.messages,
    conversation.id === active?.id ? loadedMessages : [],
    localMessages[conversation.id] ?? [],
    conversation.id === active?.id && messageHistory.ready,
  ), [localMessages, loadedMessages, active?.id, messageHistory.ready]);
  const activeMessages = active ? messagesFor(active) : [];
  const threadScroll = useThreadScroll(currentAccountJid + ":" + active?.id, `${activeMessages.length}:${activeMessages.at(-1)?.id}:${messageHistory.ready}:${mobileChatOpen}`);
  const activeAttachments = attachments.filter(item => item.conversationId === active?.id);
  const removeAttachment = (id: string) => {
    const item = attachmentRef.current.find(item => item.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    setAttachments(current => current.filter(item => item.id !== id));
  };
  const queueFiles = (files: File[]) => {
    if (!canSend || !active || pending || recording) return;
    const additions: AttachmentDraft[] = []; const errors: string[] = [];
    for (const file of files) {
      if (attachmentRef.current.length + additions.length >= 10) { errors.push("Anexe até 10 arquivos por vez."); break; }
      if (!file.size || file.size > 16 * 1024 * 1024) { errors.push(`${file.name}: o limite por arquivo é 16 MB.`); continue; }
      if (!outgoingWhatsAppMediaKind(attachmentMimeType(file))) { errors.push(`${file.name}: formato não suportado. Use imagem, PDF, texto, planilha ou apresentação.`); continue; }
      additions.push({ id: crypto.randomUUID(), file, conversationId: active.id, previewUrl: URL.createObjectURL(file) });
    }
    setAttachments(current => [...current, ...additions]);
    setNotice([...new Set(errors)].join(" "));
    if (fileInput.current) fileInput.current.value = "";
  };
  useEffect(() => {
    const storedIds = new Set([...loadedMessages.map(message => message.id), ...conversations.flatMap((conversation) => conversation.messages.map((message) => message.id))]);
    setLocalMessages((current) => {
      let changed = false;
      const next = Object.fromEntries(Object.entries(current).map(([id, messages]) => {
        const remaining = messages.filter((message) => !storedIds.has(message.id));
        if (remaining.length !== messages.length) changed = true;
        return [id, remaining];
      }));
      return changed ? next : current;
    });
  }, [conversations, loadedMessages]);
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
  const onRecorderError = useCallback((message: string) => { recordingConversationId.current = ""; setNotice(message); }, []);
  const onRecorderReady = useCallback((draft: { file: File; previewUrl: string }) => {
    const conversationId = recordingConversationId.current;
    recordingConversationId.current = "";
    if (!conversationId) { URL.revokeObjectURL(draft.previewUrl); return; }
    discardAudioDraft();
    setAudioDraft({ ...draft, conversationId });
    setNotice("Áudio anexado. Pressione Enter ou clique em Enviar para enviar.");
  }, [discardAudioDraft]);
  const { recording, level, start: startRecording, stop: stopRecording } = useAudioRecorder({ onReady: onRecorderReady, onError: onRecorderError });
  const beginRecording = () => {
    if (!canSend || !active || recordingConversationId.current) return;
    recordingConversationId.current = active.id;
    void startRecording();
  };
  useWhatsAppRealtime({ paused: !connected, initialVersion, scope: pollingScope });

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
    if (active?.unreadCount && (!window.matchMedia("(max-width: 900px)").matches || mobileChatOpen)) {
      const form = new FormData();
      form.set("conversationId", active.id);
      void markWhatsAppConversationReadAction(form);
    }
  }, [active?.id, active?.unreadCount, mobileChatOpen]);
  useEffect(() => { if (!activeId && visible[0]) setActiveId(visible[0].id); }, [activeId, visible]);
  useEffect(() => {
    if (requestedConversation.current && conversations.some(item => item.id === requestedConversation.current)) {
      setActiveId(requestedConversation.current); requestedConversation.current = ""; return;
    }
    if (activeId && !conversations.some((conversation) => conversation.id === activeId)) setActiveId(conversations[0]?.id ?? "");
  }, [activeId, conversations]);
  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => setGroupLookupTick((tick) => tick + 1), WHATSAPP_GROUP_NAME_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [connected, currentAccountJid]);
  useEffect(() => {
    if (!connected) return;
    const now = Date.now();
    const groups = initialConversations.filter(conversation => {
      const key = currentAccountJid + ':' + conversation.id;
      return !groupsInFlight.current.has(key) && shouldRefreshWhatsAppGroupName(conversation, requestedGroups.current.get(key), now);
    });
    groups.forEach(conversation => {
      const key = currentAccountJid + ':' + conversation.id;
      groupsInFlight.current.add(key);
      requestedGroups.current.set(key, now + WHATSAPP_GROUP_NAME_RETRY_MS);
    });
    void (async () => {
      for (const conversation of groups) {
        const key = currentAccountJid + ':' + conversation.id;
        const form = new FormData();
        form.set('conversationId', conversation.id);
        try {
          const result = await refreshWhatsAppGroupNameAction(form);
          if (result?.name) {
            requestedGroups.current.set(key, Number.POSITIVE_INFINITY);
            setGroupNames(current => ({ ...current, [key]: { name: result.name, previous: conversation.contactName } }));
          }
        } catch {
          // A próxima rodada tenta novamente apenas os grupos ainda sem nome.
        } finally {
          groupsInFlight.current.delete(key);
        }
      }
    })();
  }, [initialConversations, connected, currentAccountJid, groupLookupTick]);
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
    if (contactDetailsOpenedByUser.current) contactDetailsClose.current?.focus();
    contactDetailsOpenedByUser.current = false;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowContactDetails(false);
        (mobileContactDetailsTrigger.current?.getClientRects().length ? mobileContactDetailsTrigger.current : contactDetailsTrigger.current)?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showContactDetails]);

  const runConversationAction = (conversation: WhatsAppConversation, action: ConversationAction) => {
    if (!canEdit) return;
    const form = new FormData();
    form.set("conversationId", conversation.id);
    form.set("action", action);
    if (action === "list") form.set("listName", "Lista de atendimento");
    startTransition(async () => {
      try {
        await updateWhatsAppConversationAction(form);
        setMenuId("");
        setNotice(action === "delete" ? "Conversa excluída." : action === "clear" ? "Mensagens removidas da conversa." : action === "resolve_sla" ? "SLA encerrado para esta conversa." : "Conversa atualizada.");
        if (action === "clear") {
          setLocalMessages((current) => ({ ...current, [conversation.id]: [] }));
          if (activeIdRef.current === conversation.id) {
            setReplyTo(null);
            messageHistory.clearAndRetry();
          }
        }
        if (action === "delete") setActiveId("");
      } catch { setNotice("Não foi possível atualizar a conversa."); }
    });
  };
  const linkClient = (playerId: string) => {
    if (!canEdit || !active || !playerId) return;
    const form = new FormData(); form.set("conversationId", active.id); form.set("playerId", playerId);
    startTransition(async () => {
      try { await linkWhatsAppConversationToClientAction(form); setClientQuery(""); setNotice("Cliente vinculado à conversa."); }
      catch { setNotice("Não foi possível vincular o cliente."); }
    });
  };
  const saveSla = () => {
    if (!canEdit) return;
    const form = new FormData(); form.set("minutes", slaValue);
    startTransition(async () => {
      try { await updateWhatsAppSlaAction(form); setShowSla(false); setNotice("SLA de atendimento atualizado."); }
      catch { setNotice("Informe um SLA entre 5 minutos e 24 horas."); }
    });
  };
  const sendText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || pending || recording) return;
    if (activeAttachments.length) { sendAttachments(); return; }
    if (audioDraft && audioDraft.conversationId === active?.id) { void sendAudio(); return; }
    if (!active || !body.trim()) return;
    setNotice("");
    const text = body.trim();
    const reply = replyTo;
    const temporaryId = `local-${Date.now()}`;
    const temporary: WhatsAppMessage = { id: temporaryId, direction: "OUTBOUND", senderName: currentUserName, body: text, quotedProviderId: reply?.id, quotedBody: reply?.body, quotedAuthor: reply?.direction === "OUTBOUND" ? reply.senderName || "Você" : active.contactName || "Contato", mediaType: "", mediaMimeType: "", mediaUrl: "", sentAt: new Date().toISOString() };
    const form = new FormData(); form.set("conversationId", active.id); form.set("body", text);
    if (reply) form.set("replyToId", reply.id);
    threadScroll.follow();
    setLocalMessages((current) => ({ ...current, [active.id]: [...(current[active.id] ?? []), temporary] }));
    setBody("");
    setReplyTo(null);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppChatMessageAction(form);
        if ("acceptedButUnsynced" in message) {
          setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).filter((item) => item.id !== temporaryId) }));
          setNotice(unsyncedSendNotice);
        } else {
          setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).map((item) => item.id === temporaryId ? message : item) }));
        }
      } catch (error) {
        setLocalMessages((current) => ({ ...current, [active.id]: (current[active.id] ?? []).filter((item) => item.id !== temporaryId) }));
        if (activeIdRef.current === active.id) { setBody(text); setReplyTo(reply); }
        setNotice(whatsAppSendFailureMessage(error));
      }
    });
  };
  const sendAudio = async () => {
    if (!canSend || !active || !audioDraft) return;
    const draft = audioDraft;
    if (draft.conversationId !== active.id) { setNotice("Volte à conversa em que o áudio foi gravado para enviá-lo."); return; }
    const conversationId = draft.conversationId;
    threadScroll.follow();
    // Keep the object URL alive until the delivery succeeds. If Evolution is
    // temporarily unavailable, the person can retry the same recording.
    setAudioDraft(null);
    const form = new FormData(); form.set("conversationId", conversationId); form.set("audio", draft.file);
    if (replyTo) form.set("replyToId", replyTo.id);
    startTransition(async () => {
      try {
        const message = await sendWhatsAppAudioMessageAction(form);
        URL.revokeObjectURL(draft.previewUrl);
        setReplyTo(null);
        if ("acceptedButUnsynced" in message) {
          setNotice(unsyncedSendNotice);
        } else {
          setLocalMessages((current) => ({ ...current, [conversationId]: [...(current[conversationId] ?? []), message] }));
          setNotice("Áudio enviado.");
        }
      } catch {
        setAudioDraft(draft);
        setNotice("Não foi possível enviar o áudio.");
      }
    });
  };
  const sendAttachments = () => {
    if (!canSend || !active || pending || recording || !activeAttachments.length) return;
    setNotice("");
    const conversationId = active.id, batch = [...activeAttachments], reply = replyTo, caption = body.trim();
    threadScroll.follow();
    startTransition(async () => {
      let uncertain = false;
      for (const [index, draft] of batch.entries()) {
        const form = new FormData(); form.set("conversationId", conversationId); form.set("file", draft.file);
        if (reply) form.set("replyToId", reply.id);
        if (index === 0) form.set("caption", caption);
        try {
          const message = await sendWhatsAppMediaMessageAction(form);
          removeAttachment(draft.id);
          if (activeIdRef.current === conversationId) { setReplyTo(null); if (index === 0) setBody(current => current.trim() === caption ? "" : current); }
          if ("acceptedButUnsynced" in message) { uncertain = true; setNotice(unsyncedSendNotice); }
          else setLocalMessages(current => ({ ...current, [conversationId]: [...(current[conversationId] ?? []), message] }));
        } catch (error) { setNotice("Não foi possível enviar este anexo. Os arquivos restantes continuam selecionados para conferência."); return; }
      }
      if (!uncertain) setNotice(batch.length === 1 ? "Anexo enviado." : `${batch.length} anexos enviados.`);
    });
  };

  const reactToMessage = (message: WhatsAppMessage, emoji: string) => {
    if (!canSend || !active || pending) return;
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

  return <section onDragEnter={event => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepth.current += 1; if (canSend && active && !pending) setDraggingFiles(true); }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = canSend && active && !pending ? "copy" : "none"; } }} onDragLeave={event => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDraggingFiles(false); }} onDrop={event => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); dragDepth.current = 0; setDraggingFiles(false); queueFiles(Array.from(event.dataTransfer.files)); }} className={cx(viewStyles.whatsapp_chat_workspace_whatsapp_inbox, showContactDetails && active ? "has-contact-details" : undefined, mobileChatOpen ? "is-mobile-chat-open" : undefined)}>
    {draggingFiles ? <div className="tw:pointer-events-none tw:absolute tw:inset-2 tw:z-50 tw:grid tw:place-items-center tw:rounded-lg tw:border-2 tw:border-dashed tw:border-[#0b8063] tw:bg-[#edf9f4]/95 tw:p-5 tw:text-center tw:text-base tw:font-medium tw:text-[#126247]" role="status">Solte os arquivos para anexar à conversa</div> : null}
    <aside className={cx(viewStyles.whatsapp_inbox_list, mobileChatOpen ? "tw:viewport-900:hidden!" : undefined)}>
      <header><h1 className="tw:sr-only">Conversas</h1>{canEdit ? <div className={`${viewStyles.whatsapp_header_actions} tw:ml-auto`}>
        <button type="button" title="Configurar SLA" onClick={() => setShowSla((value) => !value)}><WhatsAppIcon name="clock" /></button>
        <WhatsAppContactDirectory key={currentAccountJid} accountJid={currentAccountJid} canSend={canSend} onOpenConversation={id => { requestedConversation.current = id; if (conversations.some(item => item.id === id)) setActiveId(id); setMobileChatOpen(true); }} />
        <button type="button" title="Novo cliente" onClick={() => { setLinkNewClient(false); setShowContact(true); }}><WhatsAppIcon name="plusUser" /></button>
        {showSla ? <div className={viewStyles.whatsapp_sla_popover}><label>Tempo de SLA <input value={slaValue} onChange={(event) => setSlaValue(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /> min</label><button type="button" onClick={saveSla} disabled={pending}>Salvar</button></div> : null}
      </div> : null}</header>
      <div className={viewStyles.whatsapp_filters} role="group" aria-label="Filtros de conversas">{filterOptions.map(([id, label, icon]) => <button key={id} type="button" aria-pressed={filter === id} aria-label={label} className={cx(filter === id ? "is-active" : "")} onClick={() => setFilter(id)} title={label}><i><WhatsAppIcon name={icon} size={15} /></i><span>{label}</span></button>)}</div>
      <div className={viewStyles.whatsapp_list_tools}><label><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou telefone" /></label></div>
      <div className={viewStyles.whatsapp_conversation_list}>{visible.map((conversation) => {
        const last = messagesFor(conversation).at(-1); const status = slaStatus(conversation); const mayResolveSla = conversation.unreadCount === 0 && last?.direction === "INBOUND";
        return <div key={conversation.id} className={viewStyles.whatsapp_conversation_item}>
          <button type="button" className={cx(`${conversation.id === active?.id ? "is-active" : ""} ${status === "warning" ? "is-sla-warning" : ""} ${status === "overdue" ? "is-sla-overdue" : ""}`)} aria-pressed={conversation.id === active?.id} onClick={() => { setActiveId(conversation.id); setMobileChatOpen(true); setMenuId(""); }}><Avatar conversation={conversation} withinButton onExpand={setSelectedImage} /><span><strong>{whatsAppConversationName(conversation)}{conversation.pinned ? <b className={viewStyles.whatsapp_pin}><WhatsAppIcon name="pin" size={12} /></b> : null}</strong><small>{last?.body || "Sem mensagens"}</small>{status !== "normal" ? <em>{status === "overdue" ? "SLA atrasado" : "SLA próximo do limite"}</em> : null}</span><time>{time(conversation.lastMessageAt)}{conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}</time></button>
          {canEdit ? <button className={viewStyles.whatsapp_menu_trigger} type="button" aria-label="Ações da conversa" aria-expanded={menuId === conversation.id} ref={menuId === conversation.id ? conversationMenuTrigger : undefined} onClick={() => { setActiveId(conversation.id); setMenuId(menuId === conversation.id ? "" : conversation.id); }}><WhatsAppIcon name="more" /></button> : null}
          {canEdit && menuId === conversation.id ? <div ref={conversationMenu} className={viewStyles.whatsapp_conversation_menu}>{mayResolveSla ? <button onClick={() => runConversationAction(conversation, "resolve_sla")}>✓ Encerrar SLA</button> : null}<button onClick={() => runConversationAction(conversation, "archive")}><WhatsAppIcon name="archive" size={14} /> {conversation.archivedAt ? "Desarquivar conversa" : "Arquivar conversa"}</button><button onClick={() => runConversationAction(conversation, "pin")}><WhatsAppIcon name="pin" size={14} /> {conversation.pinned ? "Desafixar conversa" : "Fixar conversa"}</button><button onClick={() => runConversationAction(conversation, "unread")}><WhatsAppIcon name="mail" size={14} /> Marcar como não lida</button><button onClick={() => runConversationAction(conversation, "favorite")}><WhatsAppIcon name="heart" size={14} /> {conversation.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}</button><button onClick={() => runConversationAction(conversation, "list")}><WhatsAppIcon name="chat" size={14} /> Adicionar à lista</button><hr /><button onClick={() => runConversationAction(conversation, "clear")}>◇ Limpar conversa</button><button className="is-danger" onClick={() => runConversationAction(conversation, "delete")}>× Excluir conversa</button></div> : null}
        </div>;
      })}{!visible.length ? <p>Nenhuma conversa encontrada.</p> : null}</div>
    </aside>
    <main className={cx(viewStyles.whatsapp_chat_main, mobileChatOpen ? "tw:viewport-900:row-start-1!" : "tw:viewport-900:hidden!")}>{active ? <>
      <header className="tw:viewport-420:gap-x-1.5! tw:viewport-420:px-2! tw:viewport-420:py-2!"><div className="tw:min-w-0 tw:flex-1 tw:viewport-420:gap-x-1.5!"><button type="button" className={viewStyles.whatsapp_mobile_back} aria-label="Voltar às conversas" onClick={() => { setMobileChatOpen(false); setShowContactDetails(false); }}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg></button><Avatar conversation={active} size="is-header" onExpand={setSelectedImage} /><span className="tw:min-w-0 tw:flex-1"><strong className="tw:viewport-420:whitespace-normal! tw:viewport-420:break-words!">{whatsAppConversationName(active)}</strong><small className="tw:viewport-420:whitespace-normal! tw:viewport-420:break-words!">{active.remoteJid.endsWith("@g.us") ? "Grupo do WhatsApp" : formatWhatsAppPhone(active.contactPhone)}</small></span></div><button ref={mobileContactDetailsTrigger} type="button" className={viewStyles.whatsapp_mobile_details} title="Detalhes do contato" aria-label="Detalhes do contato" aria-controls="whatsapp-contact-details" aria-expanded={showContactDetails} onClick={() => { contactDetailsOpenedByUser.current = !showContactDetails; setShowContactDetails((value) => !value); }}><WhatsAppIcon name="user" size={20} /></button></header>
      <div ref={threadScroll.thread} onScroll={threadScroll.onScroll} className={`${viewStyles.whatsapp_message_thread} tw:[overflow-anchor:none]`}><div ref={threadScroll.content} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-3">{messageHistory.loading ? <p role="status" className="tw:text-xs tw:text-slate-500">Carregando histórico…</p> : null}{messageHistory.failed ? <p role="status" className="tw:text-xs tw:text-slate-600">Não foi possível carregar o histórico. <button type="button" className="tw:underline" onClick={messageHistory.retry}>Tentar novamente</button></p> : null}{activeMessages.map((message) => <WhatsAppMessageBubble key={message.id} message={message} isGroup={active.remoteJid.endsWith("@g.us")} accountJid={currentAccountJid} canEdit={canSend} pending={pending} menuOpen={canSend && messageMenuId === message.id} onMenu={() => setMessageMenuId(messageMenuId === message.id ? "" : message.id)} onReply={() => { setReplyTo(message); setMessageMenuId(""); threadScroll.follow(); messageInput.current?.focus({ preventScroll: true }); }} onReact={(emoji) => reactToMessage(message, emoji)} onImage={setSelectedImage} />)}</div></div>
      {notice ? <p className={viewStyles.whatsapp_workspace_notice} role="status">{notice}</p> : null}
      {canSend ? <form className={viewStyles.whatsapp_composer} onSubmit={sendText} onKeyDown={(event) => {
        if (event.target instanceof HTMLTextAreaElement && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          if (!event.repeat) event.currentTarget.requestSubmit();
        }
      }}>
        {replyTo ? <div className={viewStyles.whatsapp_reply_preview}><div><strong>Respondendo a {replyTo.direction === "OUTBOUND" ? replyTo.senderName || "você" : active.remoteJid.endsWith("@g.us") ? replyPresentation?.senderName || "participante" : active.contactName || "contato"}</strong><span>{replyPresentation?.body || "Mensagem"}</span></div><button type="button" aria-label="Cancelar resposta" onClick={() => setReplyTo(null)}>×</button></div> : null}
        {activeAttachments.length ? <div aria-label="Anexos selecionados" className="tw:col-span-full tw:grid tw:max-h-52 tw:min-w-0 tw:gap-2 tw:overflow-y-auto">{activeAttachments.map(draft => <div key={draft.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_32px] tw:items-center tw:gap-2"><AttachmentPreview name={draft.file.name} mimeType={attachmentMimeType(draft.file)} size={draft.file.size} imageUrl={draft.file.type.startsWith("image/") ? draft.previewUrl : undefined} /><button type="button" aria-label={`Remover anexo ${draft.file.name}`} className="tw:grid tw:size-8 tw:place-items-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-[#7b4848]" disabled={pending} onClick={() => removeAttachment(draft.id)}>×</button></div>)}</div> : null}
        <input ref={fileInput} type="file" multiple aria-label="Selecionar anexos" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods" hidden disabled={pending || recording} onChange={event => queueFiles(Array.from(event.target.files ?? []))} />
        <button type="button" className={viewStyles.whatsapp_composer_icon} title="Anexar imagem ou PDF" aria-label="Anexar imagem ou PDF" onClick={() => fileInput.current?.click()}><WhatsAppIcon name="paperclip" size={20} /></button>
        <button type="button" className={cx(`${viewStyles.whatsapp_composer_icon_whatsapp_record_button} ${recording ? "is-recording" : ""}`)} title={recording ? "Parar gravação" : "Gravar áudio"} aria-label={recording ? "Parar gravação" : "Gravar áudio"} onClick={() => recording ? stopRecording() : beginRecording()}><WhatsAppIcon name="microphone" /></button>
        <div className={viewStyles.whatsapp_composer_field}>{recording ? <div className={viewStyles.whatsapp_recording_indicator} role="status"><i /><div className={viewStyles.whatsapp_recording_wave}>{Array.from({ length: 18 }, (_, index) => <b key={index} style={{ transform: `scaleY(${Math.max(.22, Math.min(1.9, .22 + level * 4.5 * (.58 + (Math.sin(index * 1.7) + 1) * .16)))})` }} />)}</div><strong>Gravando áudio</strong><small>Clique no microfone para parar</small></div> : audioDraft?.conversationId === active.id ? <div className={viewStyles.whatsapp_pending_audio}><audio controls preload="metadata" src={audioDraft.previewUrl} /><button type="button" title="Remover áudio" aria-label="Remover áudio" onClick={discardAudioDraft}>×</button></div> : <textarea ref={messageInput} aria-label="Mensagem ou legenda" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite uma mensagem..." rows={1} />}</div>
        <button type="button" className={viewStyles.whatsapp_composer_icon} title="Inserir emoji" aria-label="Inserir emoji" onClick={() => setShowEmoji((value) => !value)}><WhatsAppIcon name="smile" size={20} /></button>
        <button className={viewStyles.whatsapp_send_button} disabled={pending || recording || (!body.trim() && !activeAttachments.length && audioDraft?.conversationId !== active.id)} title={activeAttachments.length ? "Enviar anexos" : "Enviar mensagem"} aria-label={activeAttachments.length ? "Enviar anexos" : "Enviar mensagem"}><WhatsAppIcon name="send" size={19} /></button>
        {showEmoji ? <div className={viewStyles.whatsapp_emoji_picker} role="dialog" aria-label="Escolha um emoji">{emojis.map((emoji) => <button key={emoji} type="button" onClick={() => { setBody((value) => `${value}${emoji}`); setShowEmoji(false); }}>{emoji}</button>)}</div> : null}
      </form> : <div className={viewStyles.whatsapp_composer} role="status"><span className="tw:text-sm tw:text-slate-600">Você tem acesso somente de leitura a estas conversas.</span></div>}
    </> : <div className={viewStyles.whatsapp_chat_empty}><strong>Selecione uma conversa.</strong></div>}</main>
    {showContactDetails && active ? <aside id="whatsapp-contact-details" aria-label="Detalhes do contato" className={viewStyles.whatsapp_contact_panel}><button ref={contactDetailsClose} type="button" className={viewStyles.whatsapp_details_close} aria-label="Fechar detalhes do contato" onClick={() => { setShowContactDetails(false); (mobileContactDetailsTrigger.current?.getClientRects().length ? mobileContactDetailsTrigger.current : contactDetailsTrigger.current)?.focus(); }}>×</button><header><Avatar conversation={active} size="is-profile" onExpand={setSelectedImage} /><strong>{whatsAppConversationName(active)}</strong><span>{active.remoteJid.endsWith("@g.us") ? "Grupo do WhatsApp" : "Contato no WhatsApp"}</span></header><dl>{active.remoteJid.endsWith("@g.us") ? <div><dt>Tipo de conversa</dt><dd>Grupo</dd></div> : <><div><dt>Telefone</dt><dd>{formatWhatsAppPhone(active.contactPhone)}</dd></div><div><dt>Cliente no sistema</dt><dd>{active.player ? active.player.name : "Não vinculado"}</dd></div>{active.player?.email ? <div><dt>E-mail</dt><dd>{active.player.email}</dd></div> : null}</>}</dl>{canEdit && !active.remoteJid.endsWith("@g.us") && !active.player ? <div className={viewStyles.whatsapp_link_client}><strong>{matchedClient ? "Cliente encontrado pelo telefone" : "Vincular a um cliente"}</strong><p>{matchedClient ? matchedClient.name : "Busque pelo nome ou telefone para vincular."}</p>{matchedClient ? <button type="button" className={viewStyles.button_button_primary_button_small} onClick={() => linkClient(matchedClient.id)} disabled={pending}>Vincular {matchedClient.name}</button> : <><input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Digite nome ou telefone" /><div className={viewStyles.whatsapp_client_options}>{clientOptions.map((client) => <button key={client.id} type="button" onClick={() => linkClient(client.id)}>{client.name}<small>{formatWhatsAppPhone(client.phone)}</small></button>)}</div><button type="button" className={viewStyles.whatsapp_create_client} onClick={() => { setLinkNewClient(true); setShowContact(true); }}>Criar novo cliente</button></>}</div> : null}</aside> : null}
    <nav className={cx(viewStyles.whatsapp_support_toolbar, "tw:viewport-900:hidden!")} aria-label="Ferramentas da conversa"><button ref={contactDetailsTrigger} type="button" title="Detalhes do contato" aria-label="Detalhes do contato" aria-controls="whatsapp-contact-details" aria-expanded={showContactDetails && Boolean(active)} disabled={!active} onClick={() => { contactDetailsOpenedByUser.current = !showContactDetails; setShowContactDetails(value => !value); }}><WhatsAppIcon name="user" size={20} /></button></nav>
    {canEdit && showContact ? <div className={[viewStyles.whatsapp_contact_modal, fixedDialogFrame].join(" ")} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowContact(false); setLinkNewClient(false); } }}><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { const result = await createWhatsAppContactAction(form); if (linkNewClient && active) { const link = new FormData(); link.set("conversationId", active.id); link.set("playerId", result.id); await linkWhatsAppConversationToClientAction(link); } setShowContact(false); setLinkNewClient(false); setNotice(linkNewClient ? `${result.name} foi criado e vinculado à conversa.` : `${result.name} foi adicionado aos clientes.`); } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível criar o contato."); } }); }}><header><strong>{linkNewClient ? "Criar e vincular cliente" : "Novo contato"}</strong><button type="button" onClick={() => { setShowContact(false); setLinkNewClient(false); }}>×</button></header><label>Nome<input name="name" required minLength={3} defaultValue={linkNewClient ? active?.contactName : ""} placeholder="Nome completo" /></label><label>Telefone<input name="phone" required defaultValue={linkNewClient ? active?.contactPhone : ""} placeholder="(00) 00000-0000" /></label><button className={viewStyles.button_button_primary} disabled={pending}>{linkNewClient ? "Criar e vincular" : "Adicionar contato"}</button></form></div> : null}
    {selectedImage ? <div className={viewStyles.whatsapp_image_lightbox} role="dialog" aria-modal="true" aria-label="Imagem ampliada" onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); imageClose.current?.focus(); } }} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedImage(""); }}><img src={selectedImage} alt="Imagem ampliada" /><button ref={imageClose} type="button" aria-label="Fechar imagem" onClick={() => setSelectedImage("")}>×</button></div> : null}
    {!active && notice ? <p className={viewStyles.whatsapp_workspace_notice} role="status">{notice}</p> : null}
  </section>;
}
