# Escala da agenda, tipos de reserva e cadastro rápido

## Objetivo

Dar protagonismo visual à agenda e tornar o modal de reserva adequado para a operação diária, com tipo de reserva configurável e cadastro de atleta sem sair do fluxo.

## Agenda

- A página usa toda a largura disponível após a barra lateral, sem limitar a grade a uma coluna central estreita.
- A escala visual da tabela aumenta: horário, nome das quadras, células e conteúdo de reservas permanecem legíveis em telas de desktop.
- A grade conserva sua rolagem horizontal quando a arena possuir muitas quadras.

## Reserva

- O campo `Modalidade` é removido do modal.
- Há um cliente principal e um tipo de reserva.
- Os tipos iniciais são: Aula, Aula fixa, Plano, Super 12, Liga e Reserva.
- O título salvo é montado automaticamente como `Nome do cliente - Tipo de reserva`.
- Os tipos podem ser criados e mantidos pela arena em Configurações; os tipos padrão são criados/garantidos no primeiro uso para cada arena.

## Atletas e cadastro rápido

- O seletor de atleta aceita pesquisa por digitação.
- Quando não existir resultado, a opção de novo atleta abre um modal compacto sobre o modal de reserva.
- O mini-modal solicita nome e telefone obrigatórios e oferece CPF, e-mail, endereço, data de nascimento, categoria e gênero como campos opcionais.
- Após salvar, o novo atleta pertence à arena autenticada e é selecionado na linha de participante que iniciou o cadastro.

## Verificação

- Testes de interface cobrem o rótulo do tipo de reserva, nome automático, busca/cadastro rápido e a remoção de modalidade.
- Testes de schema e ação cobrem os tipos configuráveis e a criação de atleta com autorização e escopo da arena.
- Testes direcionados, TypeScript e build de produção precisam passar antes do push.
