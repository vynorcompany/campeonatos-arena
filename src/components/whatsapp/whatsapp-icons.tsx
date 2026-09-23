const paths = {
  clock: "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  plusUser: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m17-10V5m-3 3h6M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  chat: "M21 11.5a8.4 8.4 0 0 1-9 8.3A9.8 9.8 0 0 1 7.5 19L3 20l1.2-4.1A8.4 8.4 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.3 8.4 8.4 0 0 1 9 8.3Z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m17-10a4 4 0 1 0-4-4m-6 4a4 4 0 1 0-4-4",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z",
  archive: "M3 5h18v4H3zm2 4h14v10H5zM9 13h6",
  more: "M12 5.5h.01M12 12h.01M12 18.5h.01",
  pin: "m15 4-7 7m3-7 6 6m-9 1-3 3 5 5 3-3m-3-3 7-7",
  paperclip: "m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8-8a4 4 0 0 1 5.7 5.7l-8 8a2 2 0 0 1-2.8-2.8l7.4-7.4",
  smile: "M8 14s1.4 2 4 2 4-2M9 9h.01M15 9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  send: "m22 2-7 20-4-9-9-4Z",
  microphone: "M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0m5 5v4m-3 0h6",
} as const;

export type WhatsAppIconName = keyof typeof paths;

export function WhatsAppIcon({ name, size = 16 }: { name: WhatsAppIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
