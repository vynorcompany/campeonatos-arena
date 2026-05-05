export type ArenaMembership = {
  arenaId: string;
  arenaName: string;
  arenaLogoUrl: string;
  arenaRole: ArenaRole;
  viewPermissions: string[];
  editPermissions: string[];
};

export type SystemRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "VIEWER";
export type ArenaRole = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
