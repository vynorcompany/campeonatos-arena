# Seleção de atletas por categoria

## Objetivo

Permitir que a Arena inclua uma dupla em uma categoria de torneio escolhendo
atletas já cadastrados em **Atletas**, sem depender de digitação manual.

## Decisão

O fluxo manual será alinhado ao fluxo de categorias: o operador escolhe uma
categoria e dois atletas ativos da mesma Arena. A inscrição criada preserva os
dados obrigatórios de contato já existentes e fica associada à categoria
selecionada. Atletas inativos permanecem indisponíveis.

## Fluxo

1. A aba de inscrições consulta os atletas ativos da Arena atual.
2. Cada campo de atleta oferece a lista do cadastro mestre, com busca por nome.
3. A categoria é obrigatória e a dupla não pode repetir o mesmo atleta.
4. A ação grava a inscrição na categoria e continua alimentando a montagem de
   duplas existente.
5. Sem atletas ativos, a tela mostra uma orientação para cadastrá-los ou
   reativá-los em **Atletas**.

## Validação

- Cobrir com teste o carregamento de atletas ativos da Arena no formulário
  manual.
- Cobrir a rejeição de atleta duplicado na dupla.
- Executar testes relacionados, typecheck e build antes da entrega.

## Fora deste escopo

Reset de pontos e alteração de status na tela de Atletas serão tratados após a
correção principal, se houver tempo disponível.
