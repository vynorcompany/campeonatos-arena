export function ClientAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span className="tw:inline-flex tw:size-6 tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-full tw:bg-slate-100 tw:text-[10px] tw:font-normal tw:text-slate-600" aria-hidden="true">{photoUrl ? <img src={photoUrl} alt="" loading="lazy" className="tw:size-full tw:object-cover" /> : initials}</span>;
}
