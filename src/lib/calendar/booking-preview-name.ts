/** Keep the full name in the booking; only the compact grid preview is shortened. */
export function bookingPreviewName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(" ");
  const surname = parts.slice(1).find(part => !["da", "de", "do", "das", "dos", "e"].includes(part.toLowerCase()));
  return [parts[0], surname ?? parts.at(-1)].join(" ");
}
