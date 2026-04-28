export type ArenaMembership = {
  arenaId: string;
  arenaName: string;
  arenaRole: ArenaRole;
};

export type SystemRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "VIEWER";
export type ArenaRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
