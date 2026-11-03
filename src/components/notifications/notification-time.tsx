export function NotificationTime({ value }: { value:Date|string }) {
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())) return null;
 return <time dateTime={date.toISOString()} className="tw:mt-1 tw:block tw:text-[10px] tw:font-normal tw:leading-4 tw:opacity-70">{new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date)}</time>;
}
