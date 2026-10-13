-- Existing Administrator profiles used the granular support:view permission,
-- but had no way to send messages because WhatsApp required the whole support
-- module's edit permission. Grant only message sending, not conversation admin.
UPDATE "PermissionProfile"
SET "editPermissions" = array_append("editPermissions", 'support:whatsapp:send'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Administrador'
  AND 'support:view' = ANY("viewPermissions")
  AND NOT ('support' = ANY("editPermissions"))
  AND NOT ('support:whatsapp:send' = ANY("editPermissions"));
