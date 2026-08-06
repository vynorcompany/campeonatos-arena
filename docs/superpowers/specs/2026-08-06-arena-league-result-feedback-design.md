# Feedback de validação para resultados de Liga

## Objetivo

Impedir que um placar inválido de jogo de Liga substitua a página por uma tela genérica de erro.

## Escopo

- Manter as regras atuais: os sets 1 e 2 são obrigatórios e não podem empatar; o set 3 só é aceito quando os dois primeiros sets terminam 1 a 1.
- Fazer a ação de salvar retornar um estado de erro para o modal, em vez de propagar a exceção ao renderizador do Next.js.
- Exibir a mensagem de validação no modal e manter os placares informados para correção.
- Cobrir o retorno de erro com um teste de regressão.

## Fora de escopo

- Alterar regras esportivas, classificação ou dados já registrados.
- Alterar os fluxos de resultados de formatos que não são Liga.

## Fluxo

1. O usuário informa os sets e envia o formulário.
2. A ação valida e grava o resultado quando válido.
3. Quando inválido, a ação devolve a mensagem de validação ao modal.
4. O modal mostra a mensagem e permite corrigir os campos sem navegar nem recarregar a página.

## Verificação

- Teste automatizado para a conversão de falha de validação em estado exibível.
- Verificação de tipos e build do projeto.
