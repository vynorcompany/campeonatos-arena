import { readFileSync } from "node:fs";
import { resolve } from "node:path";
/** Active portal modules: the app shell, home, shared navigation and its feature model. */
export function readPortalSources() {
  return ["src/components/tournaments/public-standings.tsx", "src/components/portal/portal-home.tsx", "src/components/portal/portal-navigation.tsx", "src/lib/portal/menu.ts", "src/components/athlete-portal-wordmark.tsx"].map(file=>readFileSync(resolve(process.cwd(),file),"utf8")).join("\n");
}
