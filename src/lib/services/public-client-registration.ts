type PublicClientCandidate = {
  phone: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function resolvePublicClientPlayer<T extends PublicClientCandidate>(players: T[], normalizedPhone: string) {
  const playerByPhone = players.find((player) => normalizePhone(player.phone) === normalizedPhone) ?? null;
  return playerByPhone;
}
