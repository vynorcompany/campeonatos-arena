-- Global identity deletion must use the orphan-only SECURITY DEFINER function.
-- This prevents a tenant-scoped operation from cascading into another arena.
REVOKE DELETE ON "AthleteIdentity" FROM arena_runtime;
