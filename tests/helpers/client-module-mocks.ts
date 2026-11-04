import * as dateAvailability from "../../src/lib/calendar/date-availability";
import * as versions from "../../src/lib/record-version";

/** Keep the same synthetic database behind explicitly separated production clients. */
export function withDatabaseModuleMocks(load: (name: string) => any) {
  return (name: string): any => {
    if (name === "@/lib/calendar/date-availability") return dateAvailability;
    if (name === "@/lib/record-version") return versions;
    const module = load(name === "@/lib/auth/database" ? "@/lib/prisma" : name);
    if (name === "@/lib/auth/database") return { ...module, authDatabase: module.prisma, agencyDatabase: module.prisma };
    return module;
  };
}
