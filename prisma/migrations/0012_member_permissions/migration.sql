ALTER TABLE "ArenaMember"
ADD COLUMN "viewPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "editPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "ArenaMember"
SET
  "viewPermissions" = ARRAY[
    'dashboard',
    'tournaments',
    'players',
    'pairs',
    'groups',
    'matches',
    'tv',
    'calendar',
    'lessons',
    'students',
    'teachers',
    'pos',
    'stock',
    'finance',
    'arena',
    'users'
  ],
  "editPermissions" = ARRAY[
    'dashboard',
    'tournaments',
    'players',
    'pairs',
    'groups',
    'matches',
    'tv',
    'calendar',
    'lessons',
    'students',
    'teachers',
    'pos',
    'stock',
    'finance',
    'arena',
    'users'
  ]
WHERE "role" IN ('OWNER', 'ADMIN');

UPDATE "ArenaMember"
SET
  "viewPermissions" = ARRAY[
    'dashboard',
    'tournaments',
    'players',
    'pairs',
    'groups',
    'matches',
    'tv',
    'calendar',
    'lessons',
    'students',
    'teachers',
    'pos',
    'stock',
    'finance',
    'arena'
  ],
  "editPermissions" = ARRAY[
    'dashboard',
    'tournaments',
    'players',
    'pairs',
    'groups',
    'matches',
    'tv',
    'calendar',
    'lessons',
    'students',
    'teachers',
    'pos',
    'stock',
    'finance',
    'arena'
  ]
WHERE "role" = 'STAFF';

UPDATE "ArenaMember"
SET
  "viewPermissions" = ARRAY['dashboard', 'calendar', 'tournaments', 'players', 'matches', 'tv'],
  "editPermissions" = ARRAY[]::TEXT[]
WHERE "role" = 'VIEWER';
