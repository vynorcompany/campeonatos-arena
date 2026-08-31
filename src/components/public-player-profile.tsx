"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import { updatePublicPlayerProfileAction, type PublicProfileActionState } from "@/lib/actions/public-player-profile";

const initialState: PublicProfileActionState = { error: null, success: null };

export function PublicPlayerProfile({ arenaSlug, player }: { arenaSlug: string; player: { name: string; phone: string; email: string; birthDate: string; photoUrl: string } }) {
  const [state, action] = useFormState(updatePublicPlayerProfileAction, initialState);
  return <section className="athlete-portal-content-panel public-player-profile"><header><span>MINHA CONTA</span><h2>Meu perfil</h2></header><form action={action} className="grid-form"><input type="hidden" name="arenaSlug" value={arenaSlug} /><div className="field"><label>Foto de perfil<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" /></label>{player.photoUrl ? <img src={player.photoUrl} alt="Foto de perfil atual" className="public-player-profile-photo" /> : null}</div><div className="field"><label>Nome<input name="name" defaultValue={player.name} required /></label></div><div className="field"><label>Telefone<input name="phone" defaultValue={player.phone} required /></label></div><div className="field"><label>E-mail<input name="email" type="email" defaultValue={player.email} /></label></div><div className="field"><label>Data de nascimento<input name="birthDate" type="date" defaultValue={player.birthDate} /></label></div><div className="field field-submit"><SubmitButton label="Salvar perfil" pendingLabel="Salvando..." className="button button-primary" /></div>{state.error ? <p className="form-error form-full">{state.error}</p> : null}{state.success ? <p className="form-success form-full">{state.success}</p> : null}</form></section>;
}
