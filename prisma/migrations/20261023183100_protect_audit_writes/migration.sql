-- Default privileges from the original bootstrap may include table-wide writes.
-- Request completion may update attribution and response metadata only.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON "AuditEvent" FROM arena_runtime;
GRANT UPDATE ("arenaId", "actorId", "actorName", "details") ON "AuditEvent" TO arena_runtime;
