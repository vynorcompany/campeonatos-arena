# Ordenação de jogos da categoria

## Objetivo

Permitir que a equipe organize a lista de jogos de uma categoria sem alterar dados da competição.

## Interface

Na aba **Jogos** da categoria haverá um seletor **Ordenar jogos por** com as opções:

- Rodada (padrão atual)
- Data
- Status

A escolha fica no parâmetro `sort` da URL, junto de `tab=games`, portanto permanece ao atualizar a tela.

## Regras

- Data: jogos datados mais próximos primeiro; jogos sem data ficam por último. Empates usam horário e ordem de rodada.
- Status: Agendado, Em andamento e Finalizado, nessa ordem. Dentro de cada status, usa data e ordem de rodada.
- Rodada mantém a ordenação existente.

## Verificação

Um teste garante que a rota reconhece o parâmetro `sort`, que a lista oferece os três critérios e que a prioridade de status está explícita.
