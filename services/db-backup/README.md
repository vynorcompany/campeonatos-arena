# Backup diário do PostgreSQL

Este serviço é um cron independente da aplicação. Ele cria um dump portátil do PostgreSQL em formato customizado e o envia para um bucket S3 compatível. O cron `0 6 * * *` executa diariamente às 03:00 no horário de Brasília (UTC-3).

## Criar o serviço no Railway

1. No mesmo projeto Railway, crie um novo serviço a partir deste repositório GitHub.
2. Defina o **Root Directory** como `services/db-backup`.
3. Em **Settings**, confirme o cron `0 6 * * *`. O serviço deve encerrar após terminar; isso é esperado.
4. Adicione as variáveis abaixo.

```env
# Use a referência privada do serviço PostgreSQL do mesmo projeto.
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Bucket externo S3/R2
S3_BUCKET=arena-padel-backups
S3_ENDPOINT=https://<endpoint-s3-ou-r2>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_DEFAULT_REGION=<regiao-ou-auto-para-r2>

# Opcional
BACKUP_PREFIX=producao
```

Para Cloudflare R2, use o endpoint da API S3 da conta e `AWS_DEFAULT_REGION=auto`. Para AWS S3, use o endpoint regional e a região do bucket.

## Retenção e recuperação

Configure uma regra de ciclo de vida no bucket externo para manter pelo menos 90 dias. Não use o bucket do mesmo projeto Railway como única cópia: o objetivo deste serviço é sobreviver a uma exclusão acidental de projeto ou volume.

Depois do primeiro cron, confirme nos logs a mensagem `Backup completed`. Faça um teste de restauração em outro banco com `pg_restore` antes de depender dele em produção.
