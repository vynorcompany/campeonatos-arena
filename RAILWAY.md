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

Use uma senha forte em `INITIAL_ADMIN_PASSWORD`. O seed é apenas para bootstrap controlado; não o execute durante atualizações rotineiras.

## Banco e bootstrap

Nao precisa rodar comandos em terminal no Railway. Tambem nao precisa preencher Custom Build Command, Custom Start Command ou Pre-deploy Command manualmente se o servico estiver usando este repositorio: o arquivo `railway.json` incluido no projeto ja configura isso.

Ele define:

- Build Command: `npm run build`;
- Pre-deploy Command: `npm run db:setup`;
- Start Command: `npm run start`;
- Healthcheck Path: `/api/health`.

Durante o pre-deploy, o `db:setup` executa somente `prisma migrate deploy`, para criar/atualizar as tabelas sem reexecutar cadastros de bootstrap.

O seed de bootstrap **não** roda durante atualizações. Execute `npm run db:bootstrap` apenas uma vez, na criação controlada do ambiente, com `SEED_DEMO_DATA=false`. Isso impede que um deploy altere o administrador ou a arena inicial.

Isso acontece pelo `preDeployCommand`:

```json
{
  "deploy": {
    "preDeployCommand": "npm run db:setup"
  }
}
```

No Railway, basta configurar as variaveis de ambiente e fazer o deploy pelo GitHub. Se o pre-deploy falhar, o deploy nao entra em producao; veja os logs do deploy para descobrir qual variavel ou conexao de banco esta faltando.

Se voce preferir configurar pela UI em vez de usar `railway.json`, use exatamente os mesmos valores acima e remova o `railway.json` para evitar configuracoes duplicadas.

## Dominio publico

1. Na aba `Networking`, gere um dominio publico.
2. Atualize `APP_URL` com a URL final.
3. Faca um redeploy.

## Observacoes

- O projeto nao usa SQLite.
- O build nao executa migrations automaticamente.
- O seed nao cria dados ficticios em producao, a menos que `SEED_DEMO_DATA=true`.
- A aplicacao usa cookies `httpOnly`; em producao, eles sao marcados como `secure`.
- O servico opcional `services/db-backup` cria um dump diario do PostgreSQL em um bucket S3 externo. Consulte `services/db-backup/README.md` para configura-lo como um cron separado no Railway.

## Uploads no Cloudflare R2

Imagens enviadas pelo sistema usam armazenamento durável no R2 em produção. Configure no serviço web:

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=arena-padel-assets
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_PUBLIC_BASE_URL=https://assets.seudominio.com
```

`R2_PUBLIC_BASE_URL` deve apontar para um domínio público configurado no bucket. Sem todas essas variáveis, o envio de imagens é bloqueado em produção; nunca use o disco local como armazenamento produtivo.

Depois de configurar o R2, transfira arquivos antigos que ainda estejam em `public/uploads` executando `npm run storage:migrate-local` em um ambiente que possua os arquivos e a conexão do banco. O script só processa URLs locais (`/uploads/...`) e atualiza os registros depois que o arquivo chega ao R2.
