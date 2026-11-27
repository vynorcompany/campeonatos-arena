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

## Contratos do Portal em migração

`GET /api/portal/login-branding?host=...` retorna apenas nome e logo públicos de
uma arena ativa, usando o mapa de domínios configurado no backend. O host recebido
não é usado como destino de rede nem estabelece uma sessão.

`GET /api/portal/session?arena=...` resolve a identidade pelo cookie HttpOnly
`arena_player_session` e devolve o contexto permitido para a arena solicitada.
A resposta possui `Cache-Control: private, no-store` e não contém hashes ou tokens.

Durante a migração, `VX4_BACKEND_ORIGIN` no servidor web seleciona o transporte
HTTP desses contratos. O destino deve ser uma origem HTTP(S) sem credenciais,
caminho ou parâmetros. Redirecionamentos são recusados, a resposta é validada e
falhas não retornam silenciosamente ao banco. Sem essa configuração, a aplicação
unificada conserva o fluxo local até o corte definitivo. Essa compatibilidade é
temporária: os demais domínios ainda precisam migrar antes da retirada das
credenciais do frontend.

`POST /api/portal/auth/{operation}` trata exclusivamente cadastro/confirmação,
login global ou da arena, solicitação/confirmação de recuperação e saída do Portal.
O backend recebe somente campos de autenticação permitidos, limita o corpo a 16 KiB
e exige `Origin` na lista JSON `VX4_FRONTEND_ORIGINS`, por exemplo
`["https://arena.example"]`. Não usar curinga nem confiar em Host encaminhado.

O servidor web encaminha a origem original da ação e somente o cookie do atleta.
O resultado contém estado do formulário e um caminho interno de redirecionamento.
O cookie de sessão viaja em Set-Cookie, separado do JSON; o frontend aceita apenas
`arena_player_session`, força HttpOnly/SameSite=Lax/Path=/ e Secure em produção.
Os tokens e credenciais dos provedores permanecem na implementação do backend.
As ações web mantêm o fluxo local temporário quando a origem do backend não está
configurada; esse caminho será removido no artefato final do frontend.

As operações `request-email-verification`, `confirm-email`, `request-email-reset`
e `complete-email-reset` pertencem ao mesmo domínio de autenticação do Portal.
Possuem campos permitidos próprios: os tokens de e-mail não são aceitos nas
operações de login. A confirmação resolve a identidade pela sessão; o pedido de
recuperação não revela a existência da conta. O backend guarda os hashes dos links,
valida uso único e revoga sessões ao trocar a senha. A revalidação da interface
após confirmar o e-mail permanece na ação web.

## Contexto gerencial

`GET /api/management/context` devolve somente o contexto da sessão gerencial:
usuário, papéis, permissões e vínculos de arena. Com `?access=arena`, o backend
também aplica o bloqueio por status da arena, assinatura/período de teste e regras
de inadimplência existentes. A resposta informa um destino interno permitido
quando o acesso está bloqueado, sem redirecionamento HTTP que possa esconder uma
falha de transporte.

O frontend encaminha apenas os cookies gerencial e de arena configurados. IDs de
arena não pertencentes aos vínculos não mudam o contexto de colaboradores. As
regras da agência permanecem específicas ao papel existente. Os dados da sessão
não ficam em cache HTTP; a deduplicação de leitura ocorre somente na requisição
SSR. As guardas de módulos continuam sendo aplicadas no backend às operações de
negócio, independentemente da apresentação de menus pelo frontend.

`POST /api/management/auth/{operation}` executa login, cadastro da arena,
saída e seleção de arena/workspace. O backend valida senha, tentativas e vínculos;
o frontend aplica somente os cookies gerencial/de arena configurados, preserva o
User-Agent para identificação do dispositivo e mantém os redirecionamentos internos.
São exigidos a origem configurada e o limite de 16 KiB, como nos contratos do Portal.
Cookies são validados integralmente antes de modificar a sessão do navegador.

A recuperação gerencial por e-mail e os demais domínios ainda precisam migrar.
Não retirar as credenciais do frontend antes de concluir também esses contratos.

## Recuperação e convites gerenciais

As operações `invite`, `revoke-invite`, `request-reset`, `send-user-recovery`,
`complete-reset` e `accept-invite` executam os fluxos de conta no backend. Cada
operação possui campos próprios. Convites e recuperação administrativa exigem
arena/permissão válidas; links manuais conservam as restrições de proprietário.
O frontend revalida a listagem de usuários após convidar ou revogar e preserva os
redirecionamentos quando a sessão expira ou a arena está bloqueada.

`POST /api/management/account/token-info` é uma consulta somente de leitura,
autorizada pelo próprio token forte do link. Recebe tipo e token em corpo limitado
a 1 KiB, para não inserir o segredo em URLs de API. Retorna apenas validade e, para
convite válido, e-mail convidado, nome da arena e existência de conta. Não fornece
IDs, hashes nem tokens de sessão. As páginas de convite/redefinição usam esse
contrato; tokens expirados ou usados não exibem o formulário.

## Dashboard gerencial

`GET /api/management/dashboard` calcula os indicadores no backend e devolve apenas
cartões, detalhes e séries usados na apresentação. A arena vem da sessão e a
operação exige visualização de dashboard; não existe parâmetro para selecionar
outro banco/arena. Períodos, comparação e visão de caixa/competência são validados
no backend, com as mesmas regras de datas e projeção. A leitura não materializa
cobranças. O frontend mantém filtros e disposição visual e valida o DTO recebido.
O prazo desse contrato contempla a espera e a transação existentes do relatório.
