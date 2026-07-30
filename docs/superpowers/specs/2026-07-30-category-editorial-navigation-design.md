# Navegação editorial por categoria

## Objetivo

Tornar a gestão de categorias legível e discreta. O evento passa a ser apenas
uma lista de categorias; cada categoria possui uma página operacional própria.

## Tela do evento

- Cabeçalho compacto do evento e uma única ação de criar categoria.
- Lista em linhas, sem painéis empilhados: nome à esquerda, formato, número de
  duplas e status em colunas de largura fixa, e ação `Entrar` à direita.
- Leitura em F, margem de conteúdo controlada, divisores suaves e nenhum bloco
  decorativo redundante.

## Tela da categoria

- Rota própria dentro do evento, com retorno para a lista de categorias.
- Cabeçalho apresenta nome, formato, ranking e status em uma linha secundária.
- Abas: Visão geral, Inscrições, Grupos, Jogos e Resultados.
- Cada aba mostra apenas os dados da categoria atual; não renderiza categorias
  vizinhas.

## Configuração e inscrições

- Classe é uma lista fixa: 3ª, 4ª, 5ª, 6ª e 7ª.
- Gênero é lista fixa: Masculino ou Feminino.
- A configuração persiste os valores normalizados usados pelo cadastro de
  atletas e pelo filtro de inscrições.
- Inscrições recebem dois atletas elegíveis na página da categoria. O serviço
  continua validando classe, gênero, atividade, arena e dupla duplicada.
- A UI informa explicitamente quando não há dois atletas elegíveis e oferece
  atalho para Gestão → Atletas.

## Qualidade

- Testar as opções padronizadas, a rota de categoria, remoção de painéis de
  categorias misturados e o formulário de dupla elegível.
- Manter testes, typecheck e build aprovados.
