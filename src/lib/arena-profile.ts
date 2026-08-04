import { toPersistentArenaLogo } from "@/lib/uploads";

export type ArenaProfileFields = {
  name: string;
  legalName: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

export type ArenaProfileUpdateData = ArenaProfileFields & {
  logoUrl?: string;
};

export async function buildArenaProfileUpdateData(
  profile: ArenaProfileFields,
  logoFile: File | null
): Promise<ArenaProfileUpdateData> {
  const logoUrl = await toPersistentArenaLogo(logoFile);

  return {
    ...profile,
    ...(logoUrl ? { logoUrl } : {})
  };
}
