-- Clientes são desduplicados por telefone/CPF; nomes podem se repetir dentro da mesma Arena.
DROP INDEX IF EXISTS "Player_arenaId_name_key";
