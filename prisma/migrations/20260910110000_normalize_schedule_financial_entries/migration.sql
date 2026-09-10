-- Legacy grade entries used INCOME while the financial module recognizes REVENUE.
-- Normalize them so existing schedule charges appear in Contas a Receber and Comandas.
UPDATE "FinancialEntry"
SET "type" = 'REVENUE'
WHERE "type" = 'INCOME';
