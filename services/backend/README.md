# Publicação independente da API

O mesmo repositório oferece um alvo de publicação que contém apenas as rotas
`src/app/api`. As regras de negócio continuam nos módulos compartilhados de
`src/lib`, sem duplicar implementações ou criar outra base de dados.

```sh
npm ci
npm run build:backend
npm run start:backend
```

O build gera um diretório próprio sob `.service-build/` e registra o resultado em
`.service-build/backend.json` somente após compilar. A inicialização preserva a
conexão limitada `APP_DATABASE_URL` com o papel `arena_runtime`, deriva os papéis
restritos de autenticação/agência e retira credenciais administrativas do processo
HTTP. Migrações permanecem uma operação administrativa separada; não fazem parte
do start do backend.

O processo HTTP recusa caminhos fora de `/api/`, inclusive as páginas de login,
gerencial, Portal e arquivos de interface. As APIs preservam seus controles de
autenticação, autorização, RLS, auditoria e validação de webhooks existentes.
Quando necessário, manter a API na rede privada e encaminhar os caminhos públicos
aprovados pelo domínio da aplicação; não publicar callbacks diferentes sem
configurar e validar seus provedores.

Este alvo é a primeira etapa da separação. A aplicação web existente ainda possui
Server Actions e leituras no servidor que acessam dados diretamente. Criar a API
independente não torna o frontend livre de acesso ao banco. A migração dessas
dependências exige contratos específicos, testes e retirada final das credenciais
do banco no frontend. Não ativar uma troca de produção apenas por este build estar
saudável.

`scripts/backend-smoke-ci.mjs` valida o artefato real em banco fictício local:
saúde, ausência de rotas de interface, rejeição de acesso anônimo, proteção das
rotinas e leitura autenticada com credenciais restritas. A aplicação unificada
mantém seus comandos de build e start até a migração ser concluída.
