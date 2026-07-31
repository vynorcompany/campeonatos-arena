# Correção de status e placar de jogos

## Objetivo

Permitir que a arena corrija o placar ou o estado operacional de qualquer jogo sem manter resultados acidentalmente definitivos, preservando a integridade das classificações e do mata-mata.

## Comportamento aprovado

- Cada partida terá um status explícito: `SCHEDULED` (Agendado), `LIVE` (Em andamento) ou `FINISHED` (Finalizado).
- Salvar um placar com vencedor define a partida como `FINISHED` e preenche `winnerPairId`.
- A arena pode alterar o status e o placar enquanto a competição estiver publicada.
- Ao mudar uma partida de `FINISHED` para `SCHEDULED` ou `LIVE`, os valores de placar permanecem visíveis como referência de correção, mas `winnerPairId` é removido. Portanto, a partida não entra na classificação, não é considerada concluída e não alimenta a próxima fase até ser finalizada novamente.
- Em Liga e fase de grupos, o placar de uma partida finalizada pode ser corrigido livremente. A classificação é recalculada a partir dos resultados finalizados atuais.
- Em mata-mata, placar ou status não podem ser alterados se o vencedor já tiver sido enviado a uma partida posterior. O sistema retorna uma mensagem clara orientando a ajustar primeiro a fase posterior; ele não limpa ou reorganiza partidas seguintes automaticamente.
- Um jogo sem as duas duplas definidas não pode ser finalizado.
- Jogos de categorias diferentes continuam totalmente isolados; todas as ações verificam arena, competição e permissão de edição de torneios.

## Interface

- Cada linha de jogo exibirá um seletor de status compacto junto ao bloco de placar.
- O placar continuará editável na mesma linha durante uma competição publicada.
- O botão de salvar placar terá texto contextual: `Salvar resultado` quando o jogo não estiver finalizado e `Atualizar resultado` quando já estiver.
- Quando a alteração for bloqueada por avanço no mata-mata, a interface exibirá o erro retornado pela ação sem alterar dados.

## Persistência e fluxo

1. Adicionar `manualStatus` ao modelo de partida de categoria, com padrão `SCHEDULED`.
2. A ação de status valida os valores permitidos e executa transação serializável com a partida no escopo da arena.
3. Para reabrir, o serviço identifica dependências posteriores de mata-mata pelo participante/vencedor. Se existir dependência, rejeita a mudança; caso contrário, preserva placares e limpa apenas o vencedor.
4. Para finalizar, o serviço calcula o vencedor pelo placar, grava o status final e executa o avanço existente do mata-mata.
5. Leituras de classificação e conclusão consideram exclusivamente `winnerPairId`; assim, placares reabertos não contam.

## Testes

- Salvar placar vencedor finaliza a partida e define vencedor.
- Reabrir partida de Liga preserva placar, limpa vencedor e a remove da classificação.
- Reabrir partida de mata-mata sem avanço permitido limpa vencedor.
- Reabrir ou corrigir partida cujo vencedor já foi enviado à fase seguinte é rejeitado sem alterar a partida.
- Alterar status usa escopo de arena e exige permissão de edição de torneios.
- Validar os três status e rejeitar valores inválidos.
