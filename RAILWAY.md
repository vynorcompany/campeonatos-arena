# Deploy no Railway

Este projeto está preparado para rodar no Railway com Next.js standalone, Prisma e PostgreSQL.

## Pré-requisitos

1. Suba este repositório no GitHub.
2. Crie um projeto no Railway com `Deploy from GitHub repo`.
3. Adicione um serviço PostgreSQL no mesmo projeto.

## Variáveis da aplicação

Configure estas variáveis no serviço web:

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
INITIAL_ADMIN_EMAIL=admin@suaarena.com
INITIAL_ADMIN_PASSWORD=troque-essa-senha-forte
INITIAL_ARENA_NAME=Sua Arena
INITIAL_ARENA_SLUG=sua-arena
SEED_DEMO_DATA=false
NODE_ENV=production
```

Troque `Postgres` pelo nome real do serviço de banco, caso ele apareça com outro nome no Railway.

## Banco e bootstrap

1. Faça o deploy da aplicação.
2. No terminal/exec do serviço web, rode `npm run db:migrate:deploy`.
3. Em seguida, rode `npm run db:seed` para criar o primeiro administrador e a primeira arena.

## Domínio público

1. Na aba `Networking`, gere um domínio público.
2. Atualize `APP_URL` com a URL final do ambiente.
3. Faça um redeploy para renovar cookies e metadata com a URL correta.

## Observações

- O build não executa `db push`; a sincronização do banco fica separada em `migrate deploy`.
- O seed não cria dados fictícios em produção, a menos que `SEED_DEMO_DATA=true`.
- A aplicação usa cookies `httpOnly` e `secure` em produção.
