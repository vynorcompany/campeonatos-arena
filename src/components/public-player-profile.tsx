"use client";
import { viewStyles } from "./public-player-profile.utilities";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { AvatarCropField } from "@/components/avatar-crop-field";
import { updatePublicPlayerProfileAction, type PublicProfileActionState } from "@/lib/actions/public-player-profile";

const initialState: PublicProfileActionState = { error: null, success: null };

const padelCategories = ["Iniciante", "7ª categoria", "6ª categoria", "5ª categoria", "4ª categoria", "3ª categoria", "2ª categoria", "1ª categoria", "Profissional"];

export function PublicPlayerProfile({ arenaSlug, player }: { arenaSlug: string; player: { name: string; phone: string; email: string; bio: string; birthDate: string; photoUrl: string; gender: string; padelCategories: string[]; padelSide: string } }) {
  const [state, action] = useFormState(updatePublicPlayerProfileAction, initialState);
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  return <section className={viewStyles.athlete_portal_content_panel_public_player_profile}><header><span>MINHA CONTA</span><h2>Meu perfil</h2></header><form action={action} className={viewStyles.grid_form}><input type="hidden" name="arenaSlug" value={arenaSlug} /><div className={viewStyles.field_form_full}><label>Foto de perfil</label><AvatarCropField currentPhotoUrl={player.photoUrl} name={player.name} /></div><div className={viewStyles.field}><label>Nome<input name="name" defaultValue={player.name} required /></label></div><div className={viewStyles.field}><label>Telefone<input name="phone" defaultValue={player.phone} required /></label></div><div className={viewStyles.field}><label>E-mail<input name="email" type="email" defaultValue={player.email} /></label></div><div className={viewStyles.field}><label>Data de nascimento<input name="birthDate" type="date" defaultValue={player.birthDate} /></label></div><div className={viewStyles.field_form_full_public_player_bio}><label>Bio<textarea name="bio" defaultValue={player.bio} maxLength={800} rows={5} placeholder="Conte como foram seus últimos torneios: resultados, evolução no jogo, parceiros e metas para a próxima competição." /></label><small>Compartilhe sua trajetória no padel e ajude outros atletas a conhecerem seu jogo.</small></div><fieldset className={viewStyles.public_player_padel_profile_form_full}><legend>Seu jogo de padel</legend><p>Preencha gênero e uma categoria para aparecer no Radar e encontrar uma dupla compatível.</p><label className={viewStyles.public_player_padel_side}>Gênero<select name="gender" defaultValue={player.gender}><option value="">Selecione</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></label><div className={viewStyles.public_player_padel_categories} role="radiogroup" aria-label="Categoria de padel">{padelCategories.map((category) => <label key={category}><input type="radio" name="padelCategory" value={category} defaultChecked={player.padelCategories[0] === category} /><span>{category}</span></label>)}</div><label className={viewStyles.public_player_padel_side}>Lado de jogo<select name="padelSide" defaultValue={player.padelSide}><option value="">Ainda não informado</option><option value="RIGHT">Direita</option><option value="LEFT">Esquerda</option><option value="BOTH">Jogo dos dois lados</option></select></label></fieldset><div className={viewStyles.field_field_submit}><SubmitButton label="Salvar perfil" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>{state.error ? <p className={viewStyles.form_error_form_full}>{state.error}</p> : null}{state.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}</form></section>;
}
