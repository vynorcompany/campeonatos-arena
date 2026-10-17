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
# Conexão PostgreSQL com o papel arena_runtime e permissões limitadas.
APP_DATABASE_URL=<url-do-papel-arena_runtime>
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

As configurações versionadas dos serviços estão em `.railway/railway.ts`. Antes de aplicar alterações dessa infraestrutura, execute `railway config plan` e revise o resultado; a presença do arquivo no Git não substitui a configuração já aplicada no Railway.

O serviço da aplicação usa:

- Build Command: `npm run build`;
- Start Command: `npm run db:setup && exec node scripts/runtime-server.mjs`;
- Healthcheck Path: `/api/health`.

No início do deploy, `db:setup` executa somente `prisma migrate deploy`, sem reexecutar cadastros de bootstrap. O servidor web usa `APP_DATABASE_URL` com o papel limitado `arena_runtime`; a credencial administrativa fica restrita às migrações.

O seed de bootstrap **não** roda durante atualizações. Execute `npm run db:bootstrap` apenas uma vez, na criação controlada do ambiente, com `SEED_DEMO_DATA=false`. Isso impede que um deploy altere o administrador ou a arena inicial.

Se a migração ou o início falhar, confira os logs do deploy antes de liberar a versão. O serviço também monta um volume persistente para os uploads.

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

## Uploads no volume do Railway

O padrão atual de produção é o volume persistente montado em `/app/.next/standalone/public/uploads`. O Railway disponibiliza o caminho em `RAILWAY_VOLUME_MOUNT_PATH`; sem ele nem uma configuração R2 completa, uploads são recusados em produção para não gravar em disco efêmero. Novos arquivos ficam em `arenas/<arena-id>/<categoria>/` dentro do volume e são servidos por `/media/uploads/...`; URLs locais anteriores continuam legíveis.

Não é necessário contratar R2 para operar a aplicação. O volume evita perda dos uploads entre deploys, mas pode causar uma breve interrupção na troca de versão; monitore `/api/health` durante a publicação.

## R2 opcional

Uma migração futura para R2 exigiria decisão explícita, bucket, domínio público, credenciais e conferência das cópias antes de retirar o volume. Apenas nesse caso, configure:

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=arena-padel-assets
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_PUBLIC_BASE_URL=https://assets.seudominio.com
```

`R2_PUBLIC_BASE_URL` deve apontar para um domínio público configurado no bucket. Não preencha apenas parte dessas variáveis: a configuração parcial é rejeitada.

Se a migração for autorizada no futuro, `npm run storage:migrate-local` processa URLs locais (`/uploads/...` e `/media/uploads/...`) e atualiza os registros somente depois de verificar a cópia pública no R2. Não remova o volume antes dessa validação.
