# Deploy no Railway

Este projeto esta preparado para rodar no Railway com Next.js, Prisma e PostgreSQL.

## Pre-requisitos

1. Suba este repositorio no GitHub.
2. Crie um projeto no Railway usando `Deploy from GitHub repo`.
3. Adicione um servico PostgreSQL no mesmo projeto.
4. Conecte as variaveis do servico web ao servico PostgreSQL.

## Variaveis da aplicacao

Configure estas variaveis no servico web:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://seu-dominio-publico.up.railway.app
SESSION_COOKIE_NAME=padel_session
ARENA_COOKIE_NAME=padel_arena
SESSION_TTL_DAYS=14
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
INITIAL_ADMIN_NAME=Administrador Arena
INITIAL_ADMIN_EMAIL=admin@sua-arena.com
INITIAL_ADMIN_PASSWORD=troque-essa-senha-forte
INITIAL_ARENA_NAME=Sua Arena
INITIAL_ARENA_SLUG=sua-arena
SEED_DEMO_DATA=false
NODE_ENV=production
```

Troque `Postgres` pelo nome real do servico de banco se o Railway usar outro nome.

Use uma senha forte em `INITIAL_ADMIN_PASSWORD`. O seed pode ser executado novamente: ele atualiza o admin e a arena inicial sem duplicar registros.

## Banco e bootstrap

Depois do primeiro deploy, abra o terminal do servico web no Railway e rode:

```bash
npm run db:setup
```

Esse comando executa:

- `prisma migrate deploy`, para criar/atualizar as tabelas;
- `tsx prisma/seed.ts`, para criar o primeiro administrador e a primeira arena.

Se preferir separar os passos:

```bash
npm run db:migrate:deploy
npm run db:seed
```

## Dominio publico

1. Na aba `Networking`, gere um dominio publico.
2. Atualize `APP_URL` com a URL final.
3. Faca um redeploy.

## Observacoes

- O projeto nao usa SQLite.
- O build nao executa migrations automaticamente.
- O seed nao cria dados ficticios em producao, a menos que `SEED_DEMO_DATA=true`.
- A aplicacao usa cookies `httpOnly`; em producao, eles sao marcados como `secure`.
