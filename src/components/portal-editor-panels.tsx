"use client";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createPortalAnnouncementAction,
  createPortalEventPostAction,
  replacePortalEventPostImageAction,
  togglePortalAnnouncementAction
} from "@/lib/actions/client-portal";

type Announcement = { id: string; title: string; message: string; active: boolean };
type Post = { id: string; title: string; caption: string; imageUrl: string; active: boolean };
const portalEventImageTypes = ["image/jpeg", "image/png", "image/webp"];

function validatePortalEventImage(formData: FormData) {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return "Selecione uma imagem para o evento.";
  if (!portalEventImageTypes.includes(image.type)) return "O arquivo selecionado não é uma imagem. Envie JPG, PNG ou WebP.";
  if (image.size > 25 * 1024 * 1024) return "A imagem original deve ter no máximo 25 MB.";
  return null;
}

function Dialog({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <div className="portal-editor-modal" onMouseDown={close}>
      <section className="portal-editor-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow">PORTAL DO ATLETA</p><h2>{title}</h2></div>
          <button type="button" onClick={close} aria-label="Fechar">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ImageUploadField() {
  const [fileName, setFileName] = useState("");
  return (
    <label className="portal-upload-field">
      <span>Imagem vertical <small>1080 × 1920 · otimizada automaticamente</small></span>
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
      <span className="portal-upload-control"><strong>Selecionar imagem</strong><em>{fileName || "JPG, PNG ou WebP · até 25 MB"}</em></span>
    </label>
  );
}

export function PortalEditorPanels({ announcements, posts }: { announcements: Announcement[]; posts: Post[] }) {
  const [dialog, setDialog] = useState<"notice" | "event" | null>(null);
  const [postToReplace, setPostToReplace] = useState<Post | null>(null);
  return (
    <div className="portal-editor-workspace">
      <section className="section-card">
        <header className="portal-editor-header"><div><h2>Avisos para o portal</h2><p>Os avisos ativos aparecem na tela inicial do atleta.</p></div><button className="button button-primary button-small" type="button" onClick={() => setDialog("notice")}>Novo aviso</button></header>
        <div className="client-portal-settings-list">
          {announcements.map((announcement) => <article key={announcement.id}><div><strong>{announcement.title}</strong><span className={`portal-notice-status ${announcement.active ? "is-active" : ""}`}>{announcement.active ? "Aviso ativo" : "Aviso desativado"}</span><span className="portal-editor-text">{announcement.message}</span></div><SafeActionForm action={togglePortalAnnouncementAction}><input type="hidden" name="announcementId" value={announcement.id} /><SubmitButton label={announcement.active ? "Desativar aviso" : "Ativar aviso"} pendingLabel="Salvando..." className="button button-small" /></SafeActionForm></article>)}
          {!announcements.length ? <p className="muted">Nenhum aviso publicado.</p> : null}
        </div>
      </section>
      <section className="section-card">
        <header className="portal-editor-header"><div><h2>Eventos em destaque</h2><p>Posts verticais para a experiência mobile do atleta.</p></div><button className="button button-primary button-small" type="button" onClick={() => setDialog("event")}>Novo evento</button></header>
        <div className="portal-event-post-list">
          {posts.map((post) => <article key={post.id}><img src={post.imageUrl} alt={`Imagem do evento ${post.title}`} /><div><strong>{post.title}</strong><span className="portal-editor-text">{post.caption}</span><button className="button button-small" type="button" onClick={() => setPostToReplace(post)}>Trocar imagem</button></div></article>)}
          {!posts.length ? <p className="muted">Nenhum evento publicado.</p> : null}
        </div>
      </section>
      {dialog === "notice" ? <Dialog title="Novo aviso" close={() => setDialog(null)}><SafeActionForm action={createPortalAnnouncementAction} className="portal-editor-form" resetOnSuccess successMessage="Aviso publicado." onSuccess={() => setDialog(null)}><div className="field form-full"><label>Título<input name="title" required /></label></div><div className="field"><label>Início da publicação<input name="startsAt" type="datetime-local" /></label></div><div className="field"><label>Fim da publicação<input name="endsAt" type="datetime-local" /></label></div><div className="field form-full"><label>Aviso<textarea name="message" rows={6} required placeholder="Use **texto** para negrito." /></label></div><footer className="portal-editor-form-footer"><SubmitButton label="Publicar aviso" pendingLabel="Publicando..." className="button button-primary" /></footer></SafeActionForm></Dialog> : null}
      {dialog === "event" ? <Dialog title="Novo evento" close={() => setDialog(null)}><SafeActionForm action={createPortalEventPostAction} validate={validatePortalEventImage} className="portal-editor-form" resetOnSuccess successMessage="Evento publicado." onSuccess={() => setDialog(null)}><div className="field form-full"><label>Título<input name="title" required /></label></div><div className="field form-full"><ImageUploadField /></div><div className="field form-full"><label>Legenda<textarea name="caption" rows={6} placeholder="Use **texto** para negrito." /></label></div><footer className="portal-editor-form-footer"><SubmitButton label="Publicar evento" pendingLabel="Publicando..." className="button button-primary" /></footer></SafeActionForm></Dialog> : null}
      {postToReplace ? <Dialog title="Trocar imagem" close={() => setPostToReplace(null)}><SafeActionForm action={replacePortalEventPostImageAction} validate={validatePortalEventImage} className="portal-editor-form" resetOnSuccess successMessage="Imagem atualizada." onSuccess={() => setPostToReplace(null)}><input type="hidden" name="eventPostId" value={postToReplace.id} /><div className="field form-full"><p className="muted">Envie novamente a imagem de “{postToReplace.title}”. Ela será convertida para WebP antes da publicação.</p><ImageUploadField /></div><footer className="portal-editor-form-footer"><SubmitButton label="Atualizar imagem" pendingLabel="Atualizando..." className="button button-primary" /></footer></SafeActionForm></Dialog> : null}
    </div>
  );
}
