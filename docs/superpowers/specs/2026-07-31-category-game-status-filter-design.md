# Filtro de status dos jogos da categoria

## Objetivo

Permitir exibir apenas os jogos com o status escolhido na aba Jogos da categoria.

## Comportamento

- O formulário existente recebe o seletor **Exibir status**: Todos, Agendados, Em andamento e Finalizados.
- O filtro usa o parâmetro `status` da URL e preserva o critério `sort` já selecionado.
- A filtragem ocorre antes da ordenação e não altera status, placar nem agenda.
- Quando não houver jogos no status escolhido, a tela informa que não há resultados.

## Verificação

Teste de interface garante o parâmetro de URL, as opções do seletor e a filtragem antes da ordenação.
