INSERT INTO "Product" ("id", "name", "sku", "priceCents", "stockQuantity", "minStock", "active", "createdAt", "updatedAt", "arenaId")
SELECT CONCAT('demo-comanda-', "id"), 'Produto de teste · Água 500 ml', 'DEMO-COMANDA-AGUA', 500, 100, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, "id"
FROM "Arena"
ON CONFLICT ("arenaId", "name") DO NOTHING;
