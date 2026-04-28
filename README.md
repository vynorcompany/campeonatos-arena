# Arena Padel Manager

Sistema online para gerenciar arenas, jogadores, torneios, duplas, grupos e partidas.

## Stack

- Next.js 14 App Router
- Prisma
- PostgreSQL
- Autenticação com sessão em cookie `httpOnly`

## Variáveis de ambiente

Use o arquivo `.env.example` como base. Em produção, as variáveis mínimas são:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
APP_URL="https://seu-dominio.com"
SESSION_COOKIE_NAME="padel_session"
ARENA_COOKIE_NAME="padel_arena"
SESSION_TTL_DAYS="14"
LOGIN_MAX_ATTEMPTS="5"
LOGIN_LOCK_MINUTES="15"
INITIAL_ADMIN_NAME="Administrador Arena"
INITIAL_ADMIN_EMAIL="admin@suaarena.com"
INITIAL_ADMIN_PASSWORD="troque-essa-senha-forte"
INITIAL_ARENA_NAME="Sua Arena"
INITIAL_ARENA_SLUG="sua-arena"
SEED_DEMO_DATA="false"
```

## Desenvolvimento

1. Configure um PostgreSQL local.
2. Preencha o `.env`.
3. Rode `npm install`.
4. Rode `npm run db:migrate:deploy`.
5. Rode `npm run db:seed`.
6. Rode `npm run dev`.

## Produção

1. Configure PostgreSQL gerenciado.
2. Faça deploy da aplicação.
3. Rode `npm run db:migrate:deploy`.
4. Rode `npm run db:seed` uma vez para criar o primeiro administrador e a primeira arena.
5. Acesse `/login` com o e-mail e a senha definidos no ambiente.

## Operação

- O seed não injeta dados de demonstração por padrão.
- Sessões usam cookie `httpOnly` e token hasheado no banco.
- O login bloqueia novas tentativas após falhas repetidas.
- Usuários com acesso a mais de uma arena podem trocar a arena ativa no topo do app.
- O endpoint `GET /api/health` valida a conexão com o banco e pode ser usado em monitoramento.
