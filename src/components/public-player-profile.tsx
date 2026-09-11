"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { AvatarCropField } from "@/components/avatar-crop-field";
import { updatePublicPlayerProfileAction, type PublicProfileActionState } from "@/lib/actions/public-player-profile";

const initialState: PublicProfileActionState = { error: null, success: null };

export function PublicPlayerProfile({ arenaSlug, player }: { arenaSlug: string; player: { name: string; phone: string; email: string; birthDate: string; photoUrl: string; padelCategory: string; padelSide: string } }) {
  const [state, action] = useFormState(updatePublicPlayerProfileAction, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <section className="athlete-portal-content-panel public-player-profile"><header><span>MINHA CONTA</span><h2>Meu perfil</h2></header><form action={action} className="grid-form"><input type="hidden" name="arenaSlug" value={arenaSlug} /><div className="field form-full"><label>Foto de perfil</label><AvatarCropField currentPhotoUrl={player.photoUrl} name={player.name} /></div><div className="field"><label>Nome<input name="name" defaultValue={player.name} required /></label></div><div className="field"><label>Telefone<input name="phone" defaultValue={player.phone} required /></label></div><div className="field"><label>E-mail<input name="email" type="email" defaultValue={player.email} /></label></div><div className="field"><label>Data de nascimento<input name="birthDate" type="date" defaultValue={player.birthDate} /></label></div><fieldset className="public-player-padel-profile form-full"><legend>Seu jogo de padel</legend><p>Essas informações serão usadas em breve para encontrar a dupla ideal.</p><div><label>Categoria que joga<input name="padelCategory" list="padel-category-options" defaultValue={player.padelCategory} placeholder="Ex.: 4ª categoria" /></label><datalist id="padel-category-options"><option value="Iniciante" /><option value="7ª categoria" /><option value="6ª categoria" /><option value="5ª categoria" /><option value="4ª categoria" /><option value="3ª categoria" /><option value="2ª categoria" /><option value="1ª categoria" /><option value="Profissional" /></datalist><label>Lado de jogo<select name="padelSide" defaultValue={player.padelSide}><option value="">Ainda não informado</option><option value="RIGHT">Direita</option><option value="LEFT">Esquerda</option><option value="BOTH">Jogo dos dois lados</option></select></label></div></fieldset><div className="field field-submit"><SubmitButton label="Salvar perfil" pendingLabel="Salvando..." className="button button-primary" /></div>{state.error ? <p className="form-error form-full">{state.error}</p> : null}{state.success ? <p className="form-success form-full">{state.success}</p> : null}</form></section>;
}
