# Task 4 — Redesenho das telas internas de torneios

## Status

Concluída. A área interna de Torneios agora é orientada por evento e categoria,
com criação do evento restrita a metadados e operação dividida nas cinco etapas
previstas.

## Entregas

- A criação de evento captura somente nome, descrição, origem das inscrições,
  slug público e fase operacional. O evento pode ser criado sem categorias; os
  campos legados de estrutura são mantidos apenas como dados de compatibilidade.
- A listagem de Torneios foi substituída por cartões de evento que mostram
  categorias configuradas, categorias concluídas, inscrições recebidas e a
  próxima entrada operacional.
- O detalhe do evento usa exatamente as abas:
  `Categorias`, `Inscrições`, `Duplas e grupos`, `Tabela e jogos` e
  `Resultados`.
- A configuração da categoria oferece exatamente os formatos `Liga`,
  `3 grupos`, `4 grupos` e `Simples (grupos de 3 e 4)`, além de classe, gênero,
  ranking de duplas e opção de Ranking Geral.
- Cada cartão de categoria exibe classe/gênero, formato, ranking de duplas,
  Ranking Geral, status, contagem de duplas/jogos e a próxima ação legal.
- Os painéis focados usam diretamente as ações da Task 3 para adicionar dupla,
  gerar e ajustar grupos, publicar tabela, registrar placares e encerrar a
  categoria.
- O painel de inscrições públicas permanece somente para consulta. Nenhum
  arquivo ou comportamento da inscrição pública foi alterado nesta tarefa.
- A navegação remove `Jogadores` de Torneios e mantém `Atletas` em
  `Gestão → Atletas`.

## Regras compartilhadas e compatibilidade

- A elegibilidade exibida no seletor de atletas usa a mesma normalização de
  classe/gênero usada pela validação transacional; não existe uma comparação
  paralela no cliente.
- A disponibilidade do sorteio usa um helper compartilhado por formato. Liga
  aceita sorteio a partir de uma dupla; formatos eliminatórios exigem ao menos
  oito; Simples respeita também o máximo de dezesseis.
- O limite de dezesseis duplas do formato Simples é imposto tanto na UI quanto
  no serviço transacional serializável, impedindo que uma 17ª dupla deixe a
  categoria sem próxima ação legal.
- Ao salvar a lista de categorias, `groupCount`, `pairsPerGroup` e os valores
  existentes são serializados explicitamente, evitando reset silencioso da
  estrutura legada.
- A edição dos metadados do evento preserva a lista e os valores das categorias
  já cadastradas.

## Evidência de TDD

- RED inicial: 2 testes falharam porque a navegação ainda continha
  `href: "/jogadores"` e o formulário de competição não existia.
- RED de composição: os contratos falharam pela ausência dos cinco tabs, dos
  painéis conectados às ações da Task 3 e do formulário de evento metadata-only.
- RED de criação: o schema rejeitou evento sem categoria.
- RED de revisão: falharam os testes para elegibilidade normalizada
  compartilhada, disponibilidade legal do sorteio e preservação de
  `groupCount/pairsPerGroup`.
- RED de capacidade: o teste demonstrou que o formato Simples ainda aceitava a
  17ª dupla.
- GREEN focado final: 10/10 testes em
  `tests/tournament-category-ui.test.ts`.
- GREEN completo final: 49/49 testes em `tests/*.test.ts`.

## Revisão independente

A primeira revisão apontou três riscos importantes:

1. comparação de elegibilidade duplicada e sensível a caixa;
2. sorteio anunciado com menos duplas do que o formato permite;
3. perda de `groupCount/pairsPerGroup` ao salvar categorias.

Os três foram corrigidos com helpers compartilhados e preservação explícita dos
campos. A segunda revisão encontrou o caso limite da 17ª dupla no formato
Simples; o bloqueio foi aplicado na UI e no serviço transacional. A revisão
final encerrou com parecer `Ready`, sem bloqueadores restantes.

## Verificação

- `npx tsx --test tests/tournament-category-ui.test.ts` — 10/10 aprovados.
- `npx tsx --test tests/*.test.ts` — 49/49 aprovados.
- `npm run typecheck` — aprovado.
- `npm run lint` — aprovado, com apenas os avisos preexistentes de `<img>`.
- `npm run build` — aprovado; 52 páginas geradas.
- `git diff --check` — aprovado.

## Observações

- A aprovação e materialização de inscrições públicas continuam reservadas para
  a Task 5.
- O build continua exibindo os avisos preexistentes de otimização de `<img>` em
  telas fora do escopo; não há novo aviso introduzido pela Task 4.
