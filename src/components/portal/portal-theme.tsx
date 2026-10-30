import { cookies } from "next/headers";
import {
  PortalThemeProvider,
  type PortalThemePreference,
} from "./portal-theme-controls";

export async function PortalTheme({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const saved = (await cookies()).get("arena_portal_theme")?.value;
  const initialTheme: PortalThemePreference =
    saved === "light" || saved === "dark" ? saved : "system";
  return (
    <PortalThemeProvider initialTheme={initialTheme} className={className}>
      {children}
    </PortalThemeProvider>
  );
}
