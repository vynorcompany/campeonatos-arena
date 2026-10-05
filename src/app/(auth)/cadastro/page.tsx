import { viewStyles } from "./page.utilities";
import Image from "next/image";
import Link from "next/link";
import { RegisterArenaForm } from "@/components/forms/register-arena-form";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function RegisterArenaPage() {
  await redirectIfAuthenticated();

  return (
    <div className={viewStyles.auth_page}>
      <div className={viewStyles.auth_card_stack_md}>
        <div className={viewStyles.auth_logo_wrap}>
          <Image
            src="/arena-profile.jpg"
            alt="Logo da Arena Padel"
            width={84}
            height={84}
            className={viewStyles.auth_logo}
            priority
          />
        </div>

        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Arena Padel Manager</p>
          <h1>Cadastrar arena</h1>
          <p className={viewStyles.muted}>
            Crie a conta principal da arena. Depois você poderá convidar usuários e liberar módulos por permissão.
          </p>
        </div>

        <RegisterArenaForm />

        <p className={viewStyles.auth_switch}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
