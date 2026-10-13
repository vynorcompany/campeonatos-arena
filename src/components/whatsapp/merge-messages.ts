import type { WhatsAppMessage } from "./types";

/** A confirmed fetch replaces the snapshot; local sends win until acknowledged. */
export function mergeWhatsAppMessages(
  snapshot: WhatsAppMessage[],
  fetched: WhatsAppMessage[],
  optimistic: WhatsAppMessage[],
  fetchedIsCurrent: boolean,
) {
  return Array.from(new Map([...(fetchedIsCurrent ? fetched : snapshot), ...optimistic].map((message) => [message.id, message])).values())
    .sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime());
}
