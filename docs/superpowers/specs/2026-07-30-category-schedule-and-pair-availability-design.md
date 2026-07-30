# Agenda por jogo e disponibilidade de atletas

## Objetivo

Permitir agenda manual de cada jogo e impedir que um atleta seja selecionado em
mais de uma dupla da mesma categoria.

## Agenda

- Cada jogo de uma categoria possui data e horário de início próprios.
- O operador preenche ambos manualmente na área Jogos; não há sugestão ou
  agenda automática.
- Os valores ficam disponíveis no modelo do jogo para o futuro painel dos
  atletas, sem implementar esse painel agora.

## Duplas

- O seletor mostra somente atletas ativos e elegíveis para a classe/gênero da
  categoria que ainda não pertencem a uma dupla nela.
- Ao adicionar uma dupla, seus dois atletas somem imediatamente das duas listas
  de seleção da categoria.
- Ao remover uma dupla, os atletas voltam a ficar disponíveis.
- A regra não atravessa categorias: um atleta pode competir em outra categoria
  do mesmo evento.

## Validação

- Persistência valida data válida e horário no formato de tempo.
- A ação de criar dupla continua bloqueando duplicidade mesmo se duas telas
  tentarem salvar simultaneamente.
- Testes cobrem data/hora por jogo, exclusão do atleta já inscrito e retorno
  após remoção da dupla.
