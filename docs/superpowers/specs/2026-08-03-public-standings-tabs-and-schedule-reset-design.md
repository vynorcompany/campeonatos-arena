# Página pública: abas e reset de agendamento

## Objetivo

Melhorar a página pública de classificação para separar a consulta de rankings da consulta de jogos, com filtros claros por liga e status. No sistema interno, permitir a remoção conjunta da data e do horário de um jogo de categoria.

## Página pública

### Navegação

A página terá duas abas em forma de botões:

- **Ranking**: aba inicial, com a classificação selecionada.
- **Jogos**: agenda pública de partidas.

A seleção será preservada na URL para permitir compartilhamento e atualização sem perder o contexto.

### Aba Ranking

Um seletor de liga conterá:

- **Ranking geral**, como primeira opção;
- cada liga/categoria publicada disponível.

O Ranking geral exibirá a classificação consolidada da arena. Uma liga selecionada exibirá a classificação daquela categoria, respeitando seu formato atual (liga ou mata-mata).

### Aba Jogos

Dois seletores serão exibidos:

- **Liga**: `Todas as ligas` ou uma liga/categoria publicada;
- **Status**: `Todos`, `Agendados`, `Em andamento` e `Finalizados`.

A lista mostrará somente os jogos que atendem aos dois filtros. Ela seguirá agrupada por data quando houver data agendada e identificará claramente os jogos sem agendamento. O status deverá ser calculado com a mesma regra já usada no sistema interno.

## Sistema interno: limpar agendamento

Cada jogo de categoria terá uma ação explícita **Limpar agendamento** junto ao formulário de data e horário. A ação gravará `null` tanto para data quanto para horário.

Ela não modifica confrontos, placar, fase nem status do jogo. A validação continuará exigindo que data e horário sejam informados juntos quando houver agendamento.

## Dados e rotas

- A página pública continuará usando o serviço de classificação pública, ampliado para fornecer opções e jogos filtráveis.
- Os parâmetros de consulta distinguirão aba, liga e status sem conflitar com o parâmetro atual de classificação.
- A ação interna reutilizará a autorização e a atualização de agendamento existentes, passando valores nulos somente pela ação explícita de limpeza.

## Validação

- Testes de serviço cobrirão filtros de jogos por liga e status, além do Ranking geral.
- Testes de interface cobrirão as abas, filtros e a ação de limpar agendamento.
- Typecheck e build de produção serão executados antes do envio.
