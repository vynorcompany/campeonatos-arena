-- Existing configured standard services must be sellable in commands too.
-- Never overwrite an existing physical product with the same name.
INSERT INTO "Product" (id, "arenaId", name, sku, "priceCents", "isService", "showOnAgenda", "showOnComandas", "createdByUserId", "updatedByUserId", "updatedAt")
SELECT md5('arena-standard-service:' || p."arenaId" || ':' || p."serviceCode"), p."arenaId",
  CASE WHEN EXISTS (SELECT 1 FROM "Product" existing WHERE existing."arenaId" = p."arenaId" AND existing.name = names.name)
    THEN names.name || ' · serviço ' || substr(md5(p."arenaId" || ':' || p."serviceCode"), 1, 8)
    ELSE names.name END,
  'ARENA-SERVICE:' || p."serviceCode", p."priceCents", true, true, true, p."updatedByUserId", p."updatedByUserId", CURRENT_TIMESTAMP
FROM "ArenaServicePrice" p
JOIN (VALUES ('LEAGUE', 'Liga'), ('SUPER12', 'Super 12')) names(code, name) ON names.code = p."serviceCode"
WHERE NOT EXISTS (SELECT 1 FROM "Product" existing WHERE existing."arenaId" = p."arenaId" AND existing."isService" AND existing.sku = 'ARENA-SERVICE:' || p."serviceCode");
