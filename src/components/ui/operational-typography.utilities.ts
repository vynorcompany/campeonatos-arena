/** Shared operational hierarchy, including dialogs rendered outside the app shell. */
export const operationalTypography = [
  "tw:[&_button]:font-normal!", "tw:[&_.button]:font-normal!",
  "tw:[&_strong]:font-medium!", "tw:[&_b]:font-medium!", "tw:[&_label]:font-medium!", "tw:[&_th]:font-medium!",
  "tw:[&_h1]:font-semibold!", "tw:[&_h2]:font-semibold!", "tw:[&_h3]:font-semibold!", "tw:[&_h4]:font-semibold!",
  "tw:[&_.nav-link]:font-medium!", "tw:[&_.nav-link_span]:font-medium!",
  "tw:[&_:is(input[type=date],input[type=time],input[type=month],input[type=datetime-local])]:[font:inherit]",
  "tw:[&_:is(input[type=date],input[type=time],input[type=month],input[type=datetime-local])]:font-normal!",
  "tw:[&_:is(input[type=date],input[type=time],input[type=month],input[type=datetime-local])]:min-w-0",
  "tw:[&_:is(input[type=date],input[type=time],input[type=month],input[type=datetime-local])]:[color-scheme:light]",
].join(" ");
