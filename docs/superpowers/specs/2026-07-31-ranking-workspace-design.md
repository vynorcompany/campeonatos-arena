# Workspace de rankings

## Objetivo

Separar a consulta, a criação e a configuração dos rankings para reduzir a densidade visual da tela atual e permitir a alteração confiável do nome do ranking.

## Escopo de navegação

- `/torneios/rankings` será um índice editorial: cabeçalho curto, botão **Novo ranking** e uma linha por ranking.
- Cada linha mostrará apenas nome, tipo, modelo, sinalização de Ranking Geral/alimentação do Geral e resumo de uso. A ação primária será **Abrir**.
- `/torneios/rankings/novo` terá um cadastro inicial com nome, tipo, modelo e descrição. Ao concluir, redirecionará para o ranking criado.
- `/torneios/rankings/[rankingId]` será o workspace individual, com cabeçalho compacto e abas:
  - **Configuração**: nome, descrição, tipo, modelo e opções de Geral;
  - **Pontuação**: regras compatíveis com Liga ou Mata-mata;
  - **Classificação**: tabela correspondente ao ranking e ao ciclo selecionado;
  - **Uso**: eventos e categorias vinculados, com seu estado.

## Edição e regras de dados

- A troca de nome e descrição ficará em uma ação de atualização específica, com validação de unicidade por arena e retorno de mensagem de erro no próprio formulário.
- Tipo e modelo serão somente leitura depois que uma categoria iniciar sua competição. Antes disso, a configuração atual continuará aplicando as proteções de compatibilidade.
- Somente ranking individual pode ser o Ranking Geral. Somente ranking de duplas pode alimentar o Geral.
- O botão de remoção ficará na aba Configuração, como ação secundária com confirmação.

## Tratamento do erro atual

- O erro genérico visto em produção será reproduzido localmente com o mesmo fluxo de edição de nome.
- A ação passará a expor falhas esperadas de validação/persistência por meio do componente de formulário, sem depender do erro genérico de Server Components.
- A investigação confirmará a causa antes da alteração. O `railway.json` já executa `prisma migrate deploy` no predeploy; portanto, não será assumida uma migration ausente sem evidência.

## Componentes e responsabilidades

- Um componente de linha de ranking somente apresenta o resumo e navega para o workspace.
- Um formulário curto cuida da criação inicial.
- Um layout de workspace controla abas e contexto do ranking.
- Formulários separados cuidam de configuração e pontos, evitando que todos os campos sejam enviados e exibidos ao mesmo tempo.
- Serviços de ranking permanecem como fonte de dados para classificação e uso.

## Validação

- Testes para a atualização do nome e para mensagens de erro compreensíveis.
- Testes de rota/listagem para confirmar a separação entre índice, criação e workspace.
- Testes das abas e das regras de compatibilidade já existentes.
- Typecheck, suíte completa e build usando as variáveis locais de teste.

## Fora de escopo

- Mudança das regras de pontos existentes.
- Alteração da página pública de classificação.
- Novo formato de ranking além de Liga e Mata-mata.
