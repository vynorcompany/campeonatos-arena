# Deploy no Railway

Este projeto está preparado para rodar no Railway com Next.js standalone e Prisma usando SQLite em volume persistente.

## O que já ficou pronto no código

- `next.config.mjs` usa `output: "standalone"`.
- O script `npm start` executa `prisma db push` antes de subir o servidor.
- O app pode usar SQLite persistido por volume com `DATABASE_URL` apontando para um caminho absoluto.

## Como subir

1. Suba este repositório para o GitHub.
2. No Railway, crie um projeto novo com `Deploy from GitHub repo`.
3. Selecione este repositório.
4. Adicione uma `Volume` ao serviço e monte em `/data`.
5. Configure as variáveis:

```env
DATABASE_URL=file:/data/railway.db
SESSION_COOKIE_NAME=padel_session
NODE_ENV=production
```

6. Na aba `Networking`, gere um domínio público.
7. Faça o primeiro deploy.

## Observações

- O `prisma db push` roda no start porque o Railway não monta volumes no container de pre-deploy.
- Se quiser um setup mais robusto para produção depois, o próximo passo natural é migrar de SQLite para PostgreSQL.
