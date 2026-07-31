# Seleção de atletas por categoria

## Objetivo

Permitir que a Arena inclua uma dupla em uma categoria de torneio escolhendo
atletas já cadastrados em **Atletas**, sem depender de digitação manual.

## Decisão

O fluxo manual será alinhado ao fluxo de categorias: o operador escolhe uma
categoria e dois atletas ativos da mesma Arena. O cadastro mestre passa a
guardar telefone, CPF e data de nascimento; a inscrição reutiliza esses dados
e fica associada à categoria selecionada. Atletas inativos permanecem
indisponíveis.

## Fluxo

1. O formulário de Atletas passa a cadastrar e editar telefone, CPF e nascimento.
2. A aba de inscrições consulta os atletas ativos e completos da Arena atual.
3. Cada campo de atleta oferece a lista do cadastro mestre, com busca por nome.
4. A categoria é obrigatória e a dupla não pode repetir o mesmo atleta.
5. A ação grava a inscrição na categoria e continua alimentando a montagem de
   duplas existente.
6. Sem atletas elegíveis, a tela mostra uma orientação para cadastrá-los ou
   reativá-los em **Atletas**.

## Validação

- Cobrir com teste a persistência dos dados de contato no cadastro mestre e o
  carregamento de atletas ativos e completos no formulário manual.
- Cobrir a rejeição de atleta duplicado na dupla.
- Executar testes relacionados, typecheck e build antes da entrega.

## Fora deste escopo

Reset de pontos e alteração de status na tela de Atletas serão tratados após a
correção principal, se houver tempo disponível.
