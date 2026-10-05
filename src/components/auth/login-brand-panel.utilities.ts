/** Tailwind utilities scoped to this component. Semantic markers support state and DOM queries. */
export const viewStyles = {
  "login_brand_panel": [
    "login-brand-panel", "tw:flex", "tw:min-w-[0]", "tw:flex-col",
    "tw:justify-between", "tw:pt-[clamp(28px,_4vw,_54px)]", "tw:viewport-760:pt-[24px]", "tw:pr-[clamp(28px,_4vw,_54px)]",
    "tw:viewport-760:pr-[24px]", "tw:pb-[clamp(28px,_4vw,_54px)]", "tw:viewport-760:pb-[24px]", "tw:pl-[clamp(28px,_4vw,_54px)]",
    "tw:viewport-760:pl-[24px]", "tw:text-[color:#fff]", "tw:bg-[color:transparent]", "tw:[background-image:radial-gradient(circle_at_85%_16%,_rgb(65_166_231_/_.28),_transparent_30%),_linear-gradient(150deg,_#103e77,_#0a2955_72%)]",
    "tw:viewport-760:gap-y-[20px]", "tw:viewport-760:gap-x-[20px]",
  ].join(" "),
  "login_brand": [
    "login-brand", "tw:flex", "tw:items-center", "tw:gap-y-[13px]",
    "tw:gap-x-[13px]", "tw:text-[color:#fff]", "tw:[&_strong]:block", "tw:[&_strong]:tracking-[.13em]",
    "tw:[&_strong]:text-[.92rem]", "tw:[&_small]:block", "tw:[&_small]:tracking-[.13em]", "tw:[&_small]:mt-[2px]",
    "tw:[&_small]:text-[color:#c8e2fa]", "tw:[&_small]:text-[.57rem]",
  ].join(" "),
  "login_brand_mark": [
    "login-brand-mark", "tw:grid", "tw:w-[42px]", "tw:h-[42px]",
    "tw:place-items-center", "tw:border-t-[length:1px]", "tw:[border-top-style:solid]", "tw:border-t-[color:rgb(255_255_255_/_.45)]",
    "tw:border-r-[length:1px]", "tw:[border-right-style:solid]", "tw:border-r-[color:rgb(255_255_255_/_.45)]", "tw:border-b-[length:1px]",
    "tw:[border-bottom-style:solid]", "tw:border-b-[color:rgb(255_255_255_/_.45)]", "tw:border-l-[length:1px]", "tw:[border-left-style:solid]",
    "tw:border-l-[color:rgb(255_255_255_/_.45)]", "tw:rounded-[10px]", "tw:text-[color:#fff]", "tw:bg-[color:rgb(255_255_255_/_.12)]",
    "tw:[background-image:none]", "tw:text-[1.4rem]", "tw:font-[850]",
  ].join(" "),
  "login_brand_message": [
    "login-brand-message", "tw:max-w-[420px]", "tw:[&_h2]:mt-[14px]", "tw:viewport-760:[&_h2]:mt-[6px]",
    "tw:[&_h2]:mr-[0]", "tw:[&_h2]:mb-[16px]", "tw:viewport-760:[&_h2]:mb-[0]", "tw:[&_h2]:ml-[0]",
    "tw:[&_h2]:text-[clamp(2rem,_3.4vw,_3.1rem)]", "tw:viewport-760:[&_h2]:text-[1.35rem]", "tw:[&_h2]:font-[750]", "tw:[&_h2]:leading-[1.08]",
    "tw:[&_h2]:tracking-[-.045em]", "tw:[&_p]:text-[color:#d1e2f3]", "tw:[&_p]:leading-[1.6]", "tw:[&_p]:max-w-[350px]",
    "tw:[&_p]:mt-[0]", "tw:[&_p]:mr-[0]", "tw:[&_p]:mb-[0]", "tw:[&_p]:ml-[0]",
    "tw:[&_p]:text-[.95rem]", "tw:viewport-760:[&_h2]:max-w-[360px]", "tw:viewport-760:[&_p]:hidden",
  ].join(" "),
  "login_kicker": [
    "login-kicker", "tw:text-[color:#69d6af]", "tw:text-[.69rem]", "tw:font-[800]",
    "tw:tracking-[.14em]", "tw:viewport-760:hidden",
  ].join(" "),
  "login_brand_footer": [
    "login-brand-footer", "tw:text-[color:#d1e2f3]", "tw:leading-[1.6]", "tw:mt-[0]",
    "tw:mr-[0]", "tw:mb-[0]", "tw:ml-[0]", "tw:text-[.75rem]",
    "tw:viewport-760:hidden",
  ].join(" "),
} as const;
