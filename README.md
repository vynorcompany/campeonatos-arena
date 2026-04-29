# Arena Padel Manager

Sistema online para gerenciar arenas, jogadores, torneios, duplas, grupos e partidas.

## Stack

- Next.js 14 App Router
- Prisma
- PostgreSQL
- Autenticacao com sessao em cookie `httpOnly`

## Banco de dados

O projeto usa somente PostgreSQL. Arquivos locais antigos de banco foram removidos.

Para desenvolvimento local, suba o banco com Docker:

```bash
npm run db:local:up
```

Depois aplique as migrations e crie o primeiro administrador:

```bash
npm run db:setup
```

O seed cria ou atualiza:

- o primeiro usuario administrador;
- a primeira arena;
- o vinculo do administrador como `OWNER` da arena;
- dados de demonstracao apenas quando `SEED_DEMO_DATA="true"`.

## Variaveis de ambiente

Use `.env.example` como base. Para o banco local criado pelo Docker Compose:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campeonatos_padel?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/campeonatos_padel?schema=public"
APP_URL="http://localhost:3000"
SESSION_COOKIE_NAME="padel_session"
ARENA_COOKIE_NAME="padel_arena"
SESSION_TTL_DAYS="14"
LOGIN_MAX_ATTEMPTS="5"
LOGIN_LOCK_MINUTES="15"
INITIAL_ADMIN_NAME="Administrador Arena"
INITIAL_ADMIN_EMAIL="admin@sua-arena.com"
INITIAL_ADMIN_PASSWORD="troque-essa-senha-forte"
INITIAL_ARENA_NAME="Sua Arena"
INITIAL_ARENA_SLUG="sua-arena"
SEED_DEMO_DATA="false"
```

Troque `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` antes de usar em um ambiente publico.

## Desenvolvimento

```bash
npm install
npm run db:local:up
npm run db:setup
npm run dev
```

Acesse `/login` com o e-mail e senha definidos em `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`.

## Producao

Em producao, use um PostgreSQL gerenciado e rode:

```bash
npm run db:migrate:deploy
npm run db:seed
```

O endpoint `GET /api/health` valida a conexao com o banco e pode ser usado em monitoramento.
