# Barra de filtros dos jogos da categoria

## Causa corrigida

O formulário envia nomes duplicados para `sort` e `status` por combinar campos ocultos e seletores com o mesmo nome. A rota recebe listas em vez de valores e volta ao padrão de ordenação.

## Interface

- Uma barra de filtros com três grupos: Ordenar, Exibir status e Buscar jogador.
- Apenas os controles reais enviam `sort`, `status` e `player`.
- Um botão **Aplicar filtros** envia a combinação escolhida.
- A barra usa grade responsiva, espaçamento uniforme e quebra para linhas em telas pequenas.

## Verificação

Teste confirma apenas uma ocorrência de cada nome de filtro e a presença da classe de layout da barra.
