"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./portal-editor-panels.utilities";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createPortalAnnouncementAction,
  createPortalEventPostAction,
  deletePortalAnnouncementAction,
  deletePortalEventPostAction,
  replacePortalEventPostImageAction,
  togglePortalAnnouncementAction,
  togglePortalAnnouncementPinAction,
  togglePortalEventPostAction,
  togglePortalEventPostPinAction,
  updatePortalEventPostAction
} from "@/lib/actions/client-portal";

type Announcement = { id: string; title: string; message: string; active: boolean; pinned: boolean; linkUrl: string };
type Post = { id: string; title: string; caption: string; imageUrl: string; linkUrl: string | null; active: boolean; pinned: boolean };
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
    <div className={viewStyles.portal_editor_modal} onMouseDown={close}>
      <section className="portal-editor-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><p className={viewStyles.eyebrow}>PORTAL DO ATLETA</p><h2>{title}</h2></div>
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
    <label className={viewStyles.portal_upload_field}>
      <span>Imagem vertical <small>1080 × 1920 · otimizada automaticamente</small></span>
      <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
      <span className={viewStyles.portal_upload_control}><strong>Selecionar imagem</strong><em>{fileName || "JPG, PNG ou WebP · até 25 MB"}</em></span>
    </label>
  );
}

export function PortalEditorPanels({ announcements, posts }: { announcements: Announcement[]; posts: Post[] }) {
  const [dialog, setDialog] = useState<"notice" | "event" | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [postToReplace, setPostToReplace] = useState<Post | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  return (
    <div className={viewStyles.portal_editor_workspace}>
      <section className={viewStyles.section_card}>
        <header className={viewStyles.portal_editor_header}><div><h2>Avisos para o portal</h2><p>Os avisos ativos aparecem na tela inicial do atleta.</p></div><button className={viewStyles.button_button_primary_button_small} type="button" onClick={() => setDialog("notice")}>Novo aviso</button></header>
        <div className={viewStyles.client_portal_settings_list}>
          {announcements.map((announcement) => <article key={announcement.id}><div><strong>{announcement.pinned ? "📌 " : ""}{announcement.title}</strong><span className={cx(`portal-notice-status ${announcement.active ? "is-active" : ""}`)}>{announcement.active ? "Aviso ativo" : "Aviso desativado"}{announcement.linkUrl ? " · Link ativo" : ""}</span><span className={viewStyles.portal_editor_text}>{announcement.message}</span></div><div className={viewStyles.section_actions}><SafeActionForm action={togglePortalAnnouncementPinAction}><input type="hidden" name="announcementId" value={announcement.id} /><SubmitButton label={announcement.pinned ? "Desafixar" : "Fixar"} pendingLabel="Salvando..." className={viewStyles.button_button_small} /></SafeActionForm><SafeActionForm action={togglePortalAnnouncementAction}><input type="hidden" name="announcementId" value={announcement.id} /><SubmitButton label={announcement.active ? "Desativar aviso" : "Ativar aviso"} pendingLabel="Salvando..." className={viewStyles.button_button_small} /></SafeActionForm><button className={viewStyles.button_button_danger_button_small} type="button" onClick={() => setAnnouncementToDelete(announcement)}>Excluir</button></div></article>)}
          {!announcements.length ? <p className={viewStyles.muted}>Nenhum aviso publicado.</p> : null}
        </div>
      </section>
      <section className={viewStyles.section_card}>
        <header className={viewStyles.portal_editor_header}><div><h2>Eventos em destaque</h2><p>Posts verticais para a experiência mobile do atleta.</p></div><button className={viewStyles.button_button_primary_button_small} type="button" onClick={() => setDialog("event")}>Novo evento</button></header>
        <div className={viewStyles.portal_event_post_list}>
          {posts.map((post) => <article key={post.id}><img src={post.imageUrl} alt={`Imagem do evento ${post.title}`} /><div><strong>{post.pinned ? "📌 " : ""}{post.title}</strong><span className={viewStyles.portal_editor_text}>{post.caption}</span>{post.linkUrl ? <small>Link ativo</small> : null}<form action={togglePortalEventPostAction}><input type="hidden" name="eventPostId" value={post.id} /><label className={viewStyles.control_toggle}><input type="checkbox" defaultChecked={post.active} onChange={(event) => event.currentTarget.form?.requestSubmit()} /><span aria-hidden="true" />Exibir no Portal</label></form><div className={viewStyles.section_actions}><SafeActionForm action={togglePortalEventPostPinAction}><input type="hidden" name="eventPostId" value={post.id} /><SubmitButton label={post.pinned ? "Desafixar" : "Fixar"} pendingLabel="Salvando..." className={viewStyles.button_button_small} /></SafeActionForm><button className={viewStyles.button_button_small} type="button" onClick={() => setPostToEdit(post)}>Editar evento</button><button className={viewStyles.button_button_small} type="button" onClick={() => setPostToReplace(post)}>Trocar imagem</button><button className={viewStyles.button_button_danger_button_small} type="button" onClick={() => setPostToDelete(post)}>Excluir</button></div></div></article>)}
          {!posts.length ? <p className={viewStyles.muted}>Nenhum evento publicado.</p> : null}
        </div>
      </section>
      {dialog === "notice" ? <Dialog title="Novo aviso" close={() => setDialog(null)}><SafeActionForm action={createPortalAnnouncementAction} className={viewStyles.portal_editor_form} resetOnSuccess successMessage="Aviso publicado." onSuccess={() => setDialog(null)}><div className={viewStyles.field_form_full}><label>Título<input name="title" required /></label></div><div className={viewStyles.field}><label>Início da publicação<input name="startsAt" type="datetime-local" /></label></div><div className={viewStyles.field}><label>Fim da publicação<input name="endsAt" type="datetime-local" /></label></div><div className={viewStyles.field_form_full}><label>Link do aviso <small>Opcional. Use um endereço iniciado por https://</small><input name="linkUrl" type="url" inputMode="url" placeholder="https://exemplo.com" /></label></div><div className={viewStyles.field_form_full}><label className={viewStyles.control_toggle}><input name="pinned" type="checkbox" /><span aria-hidden="true" /><em>Fixar no topo do feed</em></label></div><div className={viewStyles.field_form_full}><label>Aviso<textarea name="message" rows={6} required placeholder="Use **texto** para negrito." /></label></div><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Publicar aviso" pendingLabel="Publicando..." className={viewStyles.button_button_primary} /></footer></SafeActionForm></Dialog> : null}
      {dialog === "event" ? <Dialog title="Novo evento" close={() => setDialog(null)}><SafeActionForm action={createPortalEventPostAction} validate={validatePortalEventImage} className={viewStyles.portal_editor_form} resetOnSuccess successMessage="Evento publicado." onSuccess={() => setDialog(null)}><div className={viewStyles.field_form_full}><label>Título<input name="title" required /></label></div><div className={viewStyles.field_form_full}><ImageUploadField /></div><div className={viewStyles.field_form_full}><label>Link ao tocar na imagem <small>Opcional. Use um endereço iniciado por https://</small><input name="linkUrl" type="url" inputMode="url" placeholder="https://exemplo.com/evento" /></label></div><div className={viewStyles.field_form_full}><label>Legenda<textarea name="caption" rows={6} placeholder="Use **texto** para negrito." /></label></div><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Publicar evento" pendingLabel="Publicando..." className={viewStyles.button_button_primary} /></footer></SafeActionForm></Dialog> : null}
      {postToEdit ? <Dialog title="Editar evento" close={() => setPostToEdit(null)}><SafeActionForm action={updatePortalEventPostAction} className={viewStyles.portal_editor_form} successMessage="Evento atualizado." onSuccess={() => setPostToEdit(null)}><input type="hidden" name="eventPostId" value={postToEdit.id} /><div className={viewStyles.field_form_full}><label>Título<input name="title" defaultValue={postToEdit.title} required /></label></div><div className={viewStyles.field_form_full}><label>Link ao tocar na imagem <small>Opcional. Use um endereço iniciado por https://</small><input name="linkUrl" type="url" inputMode="url" defaultValue={postToEdit.linkUrl ?? ""} placeholder="https://exemplo.com/evento" /></label></div><div className={viewStyles.field_form_full}><label>Legenda<textarea name="caption" rows={6} defaultValue={postToEdit.caption} placeholder="Use **texto** para negrito." /></label></div><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Salvar evento" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></footer></SafeActionForm></Dialog> : null}
      {postToReplace ? <Dialog title="Trocar imagem" close={() => setPostToReplace(null)}><SafeActionForm action={replacePortalEventPostImageAction} validate={validatePortalEventImage} className={viewStyles.portal_editor_form} resetOnSuccess successMessage="Imagem atualizada." onSuccess={() => setPostToReplace(null)}><input type="hidden" name="eventPostId" value={postToReplace.id} /><div className={viewStyles.field_form_full}><p className={viewStyles.muted}>Envie novamente a imagem de “{postToReplace.title}”. Ela será convertida para WebP antes da publicação.</p><ImageUploadField /></div><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Atualizar imagem" pendingLabel="Atualizando..." className={viewStyles.button_button_primary} /></footer></SafeActionForm></Dialog> : null}
      {announcementToDelete ? <Dialog title="Excluir aviso" close={() => setAnnouncementToDelete(null)}><SafeActionForm action={deletePortalAnnouncementAction} className={viewStyles.portal_editor_form} successMessage="Aviso excluído." onSuccess={() => setAnnouncementToDelete(null)}><input type="hidden" name="announcementId" value={announcementToDelete.id} /><p className={viewStyles.form_full_muted}>Excluir “{announcementToDelete.title}” do portal? Esta ação não pode ser desfeita.</p><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Excluir aviso" pendingLabel="Excluindo..." className={viewStyles.button_button_danger} /></footer></SafeActionForm></Dialog> : null}
      {postToDelete ? <Dialog title="Excluir evento" close={() => setPostToDelete(null)}><SafeActionForm action={deletePortalEventPostAction} className={viewStyles.portal_editor_form} successMessage="Evento excluído." onSuccess={() => setPostToDelete(null)}><input type="hidden" name="eventPostId" value={postToDelete.id} /><p className={viewStyles.form_full_muted}>Excluir “{postToDelete.title}” do portal? Esta ação não pode ser desfeita.</p><footer className={viewStyles.portal_editor_form_footer}><SubmitButton label="Excluir evento" pendingLabel="Excluindo..." className={viewStyles.button_button_danger} /></footer></SafeActionForm></Dialog> : null}
    </div>
  );
}
