import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";

export default async function HomePage() {
  const auth = await getAuthContext();
  const agencyUser = auth?.systemRole === "SUPER_ADMIN" || auth?.systemRole === "ADMIN" || auth?.systemRole === "MANAGER";
  redirect(auth ? (agencyUser ? "/agencia" : "/painel") : "/login");
}
