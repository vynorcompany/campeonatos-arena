/** Not part of the accessible form; automated bulk fillers often populate it. */
export function BotTrap() {
  return <div aria-hidden="true" className="tw:absolute tw:-left-[10000px] tw:top-auto tw:h-px tw:w-px tw:overflow-hidden"><label>Website<input name="contactWebsite" type="text" tabIndex={-1} autoComplete="off" defaultValue=""/></label></div>;
}
