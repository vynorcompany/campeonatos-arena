"use client";

import { reactionEmojis } from "@/lib/whatsapp-message-data";
import { WhatsAppIcon } from "./whatsapp-icons";
import type { WhatsAppMessage } from "./types";

export function WhatsAppMessageBubble({ message, accountJid, menuOpen, pending, onMenu, onReply, onReact, onImage }: {
  message: WhatsAppMessage; accountJid: string; menuOpen: boolean; pending: boolean;
  onMenu: () => void; onReply: () => void; onReact: (emoji: string) => void; onImage: (url: string) => void;
}) {
  const reactions = message.reactions ?? [];
  const ownReaction = reactions.find((item) => item.actorJid === accountJid)?.emoji;
  const canAct = !pending && !message.id.startsWith("local-");
  return <article className={`${message.direction === "OUTBOUND" ? "outbound" : "inbound"}${menuOpen ? " has-actions" : ""}`} tabIndex={0} aria-label="Mensagem" onClick={(event) => {
    if (!(event.target as HTMLElement).closest("button, a, img, audio, video")) onMenu();
  }} onKeyDown={(event) => {
    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onMenu(); }
  }}>
    <button className="whatsapp-message-menu-trigger" type="button" aria-label="Responder ou reagir à mensagem" aria-expanded={menuOpen} onClick={onMenu} disabled={!canAct}><WhatsAppIcon name="more" size={15} /></button>
    {message.quotedProviderId ? <div className="whatsapp-quoted-message"><strong>{message.quotedAuthor || "Mensagem citada"}</strong><span>{message.quotedBody || "Mensagem"}</span></div> : null}
    {message.mediaType === "IMAGE" ? <img className="whatsapp-message-image" src={`/api/whatsapp/media/${message.id}`} alt={message.body === "Imagem" ? "Imagem enviada pelo WhatsApp" : message.body} role="button" tabIndex={0} onClick={(event) => onImage(event.currentTarget.currentSrc || event.currentTarget.src)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onImage(event.currentTarget.currentSrc || event.currentTarget.src); } }} /> : null}
    {message.mediaType === "AUDIO" ? <audio className="whatsapp-message-audio" controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "audio/ogg"} />Seu navegador não suporta áudio.</audio> : null}
    {message.mediaType === "VIDEO" ? <video className="whatsapp-message-video" controls preload="metadata"><source src={`/api/whatsapp/media/${message.id}`} type={message.mediaMimeType || "video/mp4"} /></video> : null}
    {message.mediaType === "DOCUMENT" ? <a className="whatsapp-message-document" href={`/api/whatsapp/media/${message.id}`} target="_blank" rel="noreferrer">Abrir documento</a> : null}
    {message.body && !["Imagem", "Áudio", "Vídeo", "Documento", "Figurinha"].includes(message.body) ? <p>{message.body}</p> : null}
    <footer className="whatsapp-message-meta">{message.direction === "OUTBOUND" ? <span title="Visível apenas para a equipe">{message.senderName || "Usuário não identificado"}</span> : null}<time>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt))}</time></footer>
    {reactions.length ? <div className="whatsapp-message-reactions">{Array.from(new Set(reactions.map((item) => item.emoji))).map((emoji) => <button type="button" key={emoji} disabled={!canAct} className={emoji === ownReaction ? "is-own" : ""} aria-label={emoji === ownReaction ? `Remover minha reação ${emoji}` : `Reagir com ${emoji}`} onClick={() => onReact(emoji === ownReaction ? "" : emoji)}>{emoji}<small>{reactions.filter((item) => item.emoji === emoji).length}</small></button>)}</div> : null}
    {menuOpen ? <div className="whatsapp-message-actions" role="group" aria-label="Ações da mensagem"><button type="button" disabled={!canAct} onClick={onReply}>Responder</button><div className="whatsapp-reaction-picker" aria-label="Escolher reação">{reactionEmojis.map((emoji) => <button key={emoji} type="button" disabled={!canAct} aria-label={`Reagir com ${emoji}`} className={emoji === ownReaction ? "is-own" : ""} onClick={() => onReact(emoji === ownReaction ? "" : emoji)}>{emoji}</button>)}</div></div> : null}
  </article>;
}
