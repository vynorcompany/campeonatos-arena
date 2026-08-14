# Densidade do modal de agendamento

## Objetivo

Tornar o modal de agendamento mais operacional e legível em tela, com cobrança total da quadra, divisão rápida e quatro posições iniciais para atletas.

## Layout e comportamento

- O editor abre centralizado, com largura máxima de aproximadamente 1.100px e altura útil com rolagem interna quando necessário.
- Ele mostra sempre quatro linhas de atletas ao abrir. Linhas vazias não criam participantes nem lançamentos; o operador pode incluir linhas extras com `Adicionar atleta`.
- O horário é apresentado como intervalo calculado por início e duração, por exemplo `19:00 às 20:30`; o seletor continua controlando a duração disponível.

## Cobrança

- O modal exibe um campo editável `Valor da quadra`, independente da soma corrente dos atletas.
- Ao clicar em `Dividir igualmente`, o valor total é dividido entre todos os atletas efetivamente selecionados. O eventual resíduo de centavos fica na última linha, garantindo que a soma seja igual ao valor da quadra.
- Valores individuais permanecem editáveis após a divisão.
- Apenas linhas com atleta selecionado são persistidas e seguem a regra financeira existente: valor com método de pagamento gera receita quitada; valor sem método gera receita em aberto.

## Verificação

- Teste de interface confirma quatro linhas iniciais, campo de valor da quadra, divisão e rótulo de intervalo.
- TypeScript, testes direcionados e build de produção precisam passar antes do push.
