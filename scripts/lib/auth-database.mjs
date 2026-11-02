import { createHmac } from 'node:crypto';
export function authenticationDatabaseUrl(runtimeUrl, service = "auth") {
 const url=new URL(runtimeUrl);
 if(!['postgres:','postgresql:'].includes(url.protocol)||decodeURIComponent(url.username)!=='arena_runtime'||!url.password)throw new Error('Restricted runtime credentials required to provision authentication.');
 if(!['auth','agency'].includes(service))throw new Error('Invalid service role');
 const password=createHmac('sha256',decodeURIComponent(url.password)).update(`arena-${service}-database-v1`).digest('hex');
 url.username=`arena_${service}`;url.password=password;
 const limit=Number(url.searchParams.get("connection_limit")||2);url.searchParams.set("connection_limit",String(Math.max(1,Math.min(2,limit||2))));
 return url.toString();
}
export async function provisionAuthenticationRole(db, runtimeUrl) {
 const operational=new URL(runtimeUrl);authenticationDatabaseUrl(runtimeUrl);
 const credentials=[['arena_runtime',decodeURIComponent(operational.password)],...['auth','agency'].map(service=>['arena_'+service,new URL(authenticationDatabaseUrl(runtimeUrl,service)).password])];
 for (const [role,password] of credentials) {
  if(!['arena_runtime','arena_auth','arena_agency'].includes(role)||!password)throw new Error('Invalid service credential');
  await db.$transaction(async tx => {
   await tx.$executeRaw`SELECT set_config('app.service_password', ${password}, true)`;
   await tx.$executeRawUnsafe(`DO $password$ BEGIN EXECUTE format('ALTER ROLE ${role} LOGIN PASSWORD %L',current_setting('app.service_password')); END $password$`);
  });
 }
}
