# Rankings, página pública, Jogos e edição de eventos

## Objetivo

Separar as operações de Ranking, Jogos e visualização pública em páginas
focadas; permitir edição permanente de eventos já criados.

## Eventos

- Nome e dados gerais de um evento podem ser editados depois da criação.
- A ação de editar fica acessível na página do evento, sem expor configuração
  de categorias junto da lista de eventos.

## Rankings

- Página Rankings organizada em lista de rankings e ação de criar/editar.
- Cada ranking define separadamente tipo: Individual ou Dupla.
- Cada ranking define modelo: Liga ou Mata-mata.
- Liga configura pontos para 1º, 2º, 3º e participação.
- Mata-mata configura pontos para 1º, 2º, semifinal, quartas e participação.
- Um ranking individual pode ser marcado como Ranking Geral da arena; somente
  um ranking por arena possui essa marcação.

## Categorias públicas e página externa

- A configuração de cada categoria possui `Exibir na página pública`.
- A página pública é única por arena e oferece seletor de Ranking Geral e de
  categorias públicas encerradas.
- Cada categoria exibida informa o evento a que pertence.
- A categoria pública mostra apenas classificação esportiva final; não mostra
  controles administrativos nem pontuação interna de ranking.
- Ranking Geral exibe sua tabela de classificação pública.

## Jogos

- A página Jogos começa com seletor de evento ativo.
- Após escolher o evento, exige escolher uma de suas categorias ativas.
- A página de placares é aberta apenas para essa categoria, pois categorias
  diferentes não se enfrentam.

## Qualidade

- Preservar autorização de arena em toda rota administrativa.
- Validar unicidade do Ranking Geral e compatibilidade de modelo/tabela.
- Testar filtros da página pública: categoria só aparece quando pública e
  encerrada; Jogos não mistura categorias.
