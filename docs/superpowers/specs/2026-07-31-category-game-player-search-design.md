# Busca por atleta nos jogos da categoria

## Objetivo

Permitir localizar jogos pelo nome de qualquer atleta presente em uma das duas duplas.

## Comportamento

- A aba Jogos recebe o campo **Buscar jogador**.
- A busca aceita trecho do nome, sem diferença entre maiúsculas e minúsculas.
- O parâmetro `player` na URL preserva a busca junto da ordenação e do filtro de status.
- O jogo é exibido quando o termo ocorre no nome da dupla mandante ou visitante.
- Nenhum jogo ou cadastro é alterado.

## Verificação

Teste de interface garante o campo, o parâmetro de URL e a filtragem combinada antes da ordenação.
