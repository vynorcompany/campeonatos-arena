const field = "tw:grid tw:min-w-0 tw:content-start tw:gap-2 tw:text-sm tw:text-[#172b45] tw:[&>label]:font-medium tw:[&_:is(input,select)]:w-full tw:[&_:is(input,select)]:min-w-0 tw:[&_:is(input,select)]:min-h-11 tw:[&_:is(input,select)]:rounded-md tw:[&_:is(input,select)]:border tw:[&_:is(input,select)]:border-[#718bac] tw:[&_:is(input,select)]:bg-white tw:[&_:is(input,select)]:px-3 tw:[&_:is(input,select)]:text-[#172b45] tw:[&_:is(input,select):focus-visible]:outline-2 tw:[&_:is(input,select):focus-visible]:outline-[#215da5]";
const step = "tw:grid tw:min-w-0 tw:grid-cols-[28px_minmax(0,1fr)] tw:items-start tw:gap-2 tw:[&>span]:grid tw:[&>span]:size-7 tw:[&>span]:place-items-center tw:[&>span]:rounded-full tw:[&>span]:border tw:[&>span]:border-[#215da5] tw:[&>span]:text-[#174983] tw:[&_strong]:block tw:[&_strong]:text-sm tw:[&_small]:block tw:[&_small]:text-xs tw:[&_small]:leading-relaxed tw:[&_small]:text-[#465c75]";
export const viewStyles = {
 public_reg_shell: "public-reg-shell tw:grid tw:min-w-0 tw:gap-5 tw:text-[#172b45]",
 public_reg_aside_reveal_up: "public-reg-aside tw:grid tw:min-w-0 tw:grid-cols-[180px_minmax(0,1fr)] tw:items-center tw:gap-4 tw:border-b tw:border-[#c7d8eb] tw:pb-5 tw:viewport-760:grid-cols-1",
 public_reg_brand: "tw:flex tw:min-w-0 tw:items-center tw:gap-3 tw:[&_img]:size-10 tw:[&_img]:object-contain tw:[&_strong]:text-sm tw:[&_span]:text-sm",
 public_reg_kicker: "tw:sr-only",
 public_reg_steps: "tw:grid tw:min-w-0 tw:grid-cols-3 tw:gap-4 tw:viewport-560:grid-cols-1 tw:viewport-560:gap-3",
 public_reg_step: step,
 public_reg_step_public_reg_step_done: step + " tw:[&>span]:bg-[#174983] tw:[&>span]:text-white",
 public_reg_step_active: "tw:[&>span]:bg-[#087443] tw:[&>span]:text-white",
 public_reg_form_reveal_up: "tw:grid tw:min-w-0 tw:grid-cols-2 tw:items-start tw:gap-5 tw:viewport-760:grid-cols-1 tw:[&>.public-reg-contact]:col-span-full tw:[&>.public-reg-contact]:m-0 tw:[&>.public-reg-contact]:text-sm tw:[&>.public-reg-contact]:text-[#465c75]",
 public_reg_card: "public-reg-card tw:grid tw:min-w-0 tw:gap-4 tw:rounded-lg tw:border tw:border-[#c7d8eb] tw:bg-white tw:p-5 tw:viewport-560:p-4 tw:first-of-type:col-span-full",
 public_reg_card_head: "tw:grid tw:gap-1 tw:border-b tw:border-[#dbe5f1] tw:pb-3 tw:[&_:is(h2,h3)]:m-0 tw:[&_:is(h2,h3)]:text-lg tw:[&_:is(h2,h3)]:font-semibold tw:[&_:is(h2,h3)]:text-[#174983] tw:[&_p]:m-0 tw:[&_p]:text-sm tw:[&_p]:leading-relaxed tw:[&_p]:text-[#465c75]",
 public_reg_grid_public_reg_grid_2: "tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-4 tw:viewport-560:grid-cols-1",
 field,
 public_reg_select: "tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[#718bac] tw:bg-white tw:text-[#172b45]",
 public_reg_submit: "tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[#c7d8eb] tw:pt-4",
 button_button_primary: "tw:inline-flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border tw:border-[#087443] tw:bg-[#087443] tw:px-5 tw:py-2 tw:text-sm tw:font-semibold tw:text-white tw:hover:border-[#065b35] tw:hover:bg-[#065b35] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#087443] tw:disabled:opacity-60",
 form_error_form_full: "tw:col-span-full tw:m-0 tw:rounded tw:border tw:border-[#a02119] tw:p-3 tw:text-sm tw:text-[#a02119]",
 form_success_form_full_reveal_up: "tw:col-span-full tw:rounded tw:border tw:border-[#087443] tw:p-3 tw:text-sm tw:text-[#065b35]",
} as const;
