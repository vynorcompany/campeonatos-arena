import { sharedUtilities } from "@/components/ui/shared.utilities";
/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "auth_page_login_page": sharedUtilities.authPageLoginPage,
  "login_shell": sharedUtilities.loginShell,
  "login_form_panel": sharedUtilities.loginFormPanel,
  "login_form_content": sharedUtilities.loginFormContent,
  "login_form_eyebrow": sharedUtilities.loginFormEyebrow,
  "login_form_intro": sharedUtilities.loginFormIntro,
  "auth_switch": sharedUtilities.authSwitch,
} as const;
