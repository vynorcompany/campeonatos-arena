import { normalizeBrazilianPhone } from "@/lib/phone";

type PublicClientCandidate = {
  phone: string;
};

export function resolvePublicClientPlayer<T extends PublicClientCandidate>(players: T[], phone: string) {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  const playerByPhone = players.find((player) => normalizeBrazilianPhone(player.phone) === normalizedPhone) ?? null;
  return playerByPhone;
}
