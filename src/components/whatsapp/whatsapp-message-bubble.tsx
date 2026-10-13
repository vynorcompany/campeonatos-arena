"use client";
import React from "react";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./whatsapp-message-bubble.utilities";

import { reactionEmojis } from "@/lib/whatsapp-message-data";
import { presentWhatsAppGroupMessage } from "@/lib/whatsapp-group-message";
import { WhatsAppIcon } from "./whatsapp-icons";
import type { WhatsAppMessage } from "./types";

export function WhatsAppMessageBubble({ message, isGroup, accountJid, canEdit, menuOpen, pending, onMenu, onReply, onReact, onImage }: {
  message: WhatsAppMessage; isGroup: boolean; accountJid: string; canEdit: boolean; menuOpen: boolean; pending: boolean;
  onMenu: () => void; onReply: () => void; onReact: (emoji: string) => void; onImage: (url: string) => void;
}) {
  const reactions = message.reactions ?? [];
  const ownReaction = reactions.find((item) => item.actorJid === accountJid)?.emoji;
  const canAct = canEdit && !pending && !message.id.startsWith("local-");
  const presented = presentWhatsAppGroupMessage({ isGroup, direction: message.direction, body: message.body, senderName: message.senderName });
  return <article className={cx(`${message.direction === "OUTBOUND" ? "outbound" : "inbound"}${menuOpen ? " has-actions" : ""}`)} tabIndex={canEdit ? 0 : -1} aria-label="Mensagem" onClick={(event) => {
    if (canEdit && !(event.target as HTMLElement).closest("button, a, img, audio, video")) onMenu();
  }} onKeyDown={(event) => {
    if (canEdit && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onMenu(); }
  }}>
    {canEdit ? <button className={viewStyles.whatsapp_message_menu_trigger} type="button" aria-label="Responder ou reagir à mensagem" aria-expanded={menuOpen} onClick={onMenu} disabled={!canAct}><WhatsAppIcon name="more" size={15} /></button> : null}
    {presented.senderName ? <strong className={viewStyles.whatsapp_group_sender}>{presented.senderName}</strong> : null}
    {message.quotedProviderId ? <div className={viewStyles.whatsapp_quoted_message}><strong>{message.quotedAuthor || "Mensagem citada"}</strong><span>{message.quotedBody || "Mensagem"}</span></div> : null}
    {message.mediaType === "IMAGE" ? <img className={viewStyles.whatsapp_message_image} src={`/api/whatsapp/media/${message.id}`} alt={presented.body === "Imagem" ? "Imagem enviada pelo WhatsApp" : presented.body} role="button" tabIndex={0} onClick={(event) => onImage(event.currentTarget.currentSrc || event.currentTarget.src)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onImage(event.currentTarget.currentSrc || event.currentTarget.src); } }} /> : null}
    {message.mediaType === "AUDIO" ? <audio className={viewStyles.whatsapp_message_audio} controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "audio/ogg"} />Seu navegador não suporta áudio.</audio> : null}
    {message.mediaType === "VIDEO" ? <video className={viewStyles.whatsapp_message_video} controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "video/mp4"} /></video> : null}
    {message.mediaType === "DOCUMENT" ? <a className={viewStyles.whatsapp_message_document} href={`/api/whatsapp/media/${message.id}`} target="_blank" rel="noreferrer">Abrir documento</a> : null}
    {presented.body && !["Imagem", "Áudio", "Vídeo", "Documento", "Figurinha"].includes(presented.body) ? <p>{presented.body}</p> : null}
    <footer className={viewStyles.whatsapp_message_meta}>{message.direction === "OUTBOUND" ? <span title="Visível apenas para a equipe">{message.senderName || "Usuário não identificado"}</span> : null}<time>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt))}</time></footer>
    {reactions.length ? <div className={viewStyles.whatsapp_message_reactions}>{Array.from(new Set(reactions.map((item) => item.emoji))).map((emoji) => <button type="button" key={emoji} disabled={!canAct} className={cx(emoji === ownReaction ? "is-own" : "")} aria-label={emoji === ownReaction ? `Remover minha reação ${emoji}` : `Reagir com ${emoji}`} onClick={() => onReact(emoji === ownReaction ? "" : emoji)}>{emoji}<small>{reactions.filter((item) => item.emoji === emoji).length}</small></button>)}</div> : null}
    {canEdit && menuOpen ? <div className={viewStyles.whatsapp_message_actions} role="group" aria-label="Ações da mensagem"><button type="button" disabled={!canAct} onClick={onReply}>Responder</button><div className={viewStyles.whatsapp_reaction_picker} aria-label="Escolher reação">{reactionEmojis.map((emoji) => <button key={emoji} type="button" disabled={!canAct} aria-label={`Reagir com ${emoji}`} className={cx(emoji === ownReaction ? "is-own" : "")} onClick={() => onReact(emoji === ownReaction ? "" : emoji)}>{emoji}</button>)}</div></div> : null}
  </article>;
}
