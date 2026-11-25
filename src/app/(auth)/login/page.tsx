import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { AthletePortalWordmark } from "@/components/athlete-portal-wordmark";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return <div className="tw:grid tw:min-h-dvh tw:min-w-0 tw:content-center tw:gap-8 tw:bg-[#102d51] tw:bg-[linear-gradient(90deg,rgba(7,25,47,.78),rgba(7,25,47,.28)),url('/images/padel-night.webp')] tw:bg-cover tw:bg-center tw:px-6 tw:py-8 tw:font-normal tw:text-[#202c3c] tw:[&_*]:box-border tw:min-[760px]:grid-cols-[minmax(0,1fr)_360px] tw:min-[760px]:content-stretch tw:min-[760px]:gap-[7vw] tw:min-[760px]:px-[7vw] tw:min-[760px]:py-10">
    <aside aria-label="VX4" className="tw:min-w-0 tw:py-4">
      <div className="tw:mx-auto tw:flex tw:w-[250px] tw:max-w-full tw:items-center tw:gap-5 tw:min-[760px]:mx-0 tw:min-[760px]:w-[270px]">
        <span aria-hidden="true" className="tw:h-px tw:flex-1 tw:bg-[#90abc7]"/>
        <div className="tw:w-[140px] tw:shrink-0 tw:min-[760px]:w-[150px]"><AthletePortalWordmark surface="dark"/></div>
        <span aria-hidden="true" className="tw:h-px tw:flex-1 tw:bg-[#90abc7]"/>
      </div>
    </aside>
    <main className="tw:mx-auto tw:w-full tw:min-w-0 tw:max-w-[400px] tw:self-center tw:rounded-[5px] tw:bg-white tw:p-6 tw:dark:bg-[#101c2d] tw:dark:text-[#eaf3ff] tw:min-[760px]:p-7 tw:[&_.login-form]:gap-4! tw:[&_.login-form_.field_label]:font-normal! tw:[&_.login-form_.field_input]:min-h-11! tw:[&_.login-form_.field_input]:rounded-[5px]! tw:[&_.login-form_.field_input]:font-normal! tw:[&_.login-form_.button-block]:min-h-11! tw:[&_.login-form_.button-block]:rounded-[5px]! tw:[&_.login-form_.button-block]:font-normal! tw:[&_.login-forgot-link]:font-normal! tw:dark:[&_.login-form_.field_label]:text-[#eaf3ff]! tw:dark:[&_.login-form_.field_input]:bg-[#14263d]! tw:dark:[&_.login-form_.field_input]:text-[#eaf3ff]! tw:dark:[&_.login-form_.field_input]:border-[#3b5271]! tw:dark:[&_.login-form_.field_input]:placeholder:text-[#a4b3c8]! tw:dark:[&_.login-forgot-link]:text-[#a5caff]!">
      <h1 className="tw:m-0 tw:mb-6 tw:text-2xl tw:font-semibold tw:leading-tight tw:tracking-[-.02em]">Entre no VX4</h1>
      <LoginForm />
      <p className="tw:m-0 tw:mt-5 tw:text-center tw:text-xs"><Link href="/cadastro" className="tw:inline-flex tw:min-h-9 tw:items-center tw:rounded-[5px] tw:px-2 tw:text-[#174983] tw:no-underline tw:hover:underline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983] tw:dark:text-[#a5caff]">Cadastrar arena</Link></p>
    </main>
  </div>;
}
