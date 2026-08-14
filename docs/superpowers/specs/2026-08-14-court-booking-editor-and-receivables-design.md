# Editor de agendamento de quadra e contas a receber

## Objetivo

Converter o modal de horário em um editor operacional: criar e editar agendamentos, incluir atletas, definir duração e cobrar individualmente.

## Dados

- `ScheduleOccurrence` passa a representar o agendamento operacional de uma ou mais quadras.
- Novo modelo `ScheduleParticipant` relaciona o agendamento a um atleta (`Player`), com valor individual em centavos, forma de pagamento opcional e lançamento financeiro opcional.
- Um atleta não pode aparecer duas vezes no mesmo agendamento.
- Um agendamento possui início, fim, título, modalidade opcional, observações e participantes.

## Editor central

- Clique em horário livre abre formulário de novo agendamento com quadra, data/hora, duração configurável, título/modalidade e participantes.
- Clique em horário ocupado abre o mesmo formulário preenchido para edição.
- O editor permite pesquisar e adicionar atletas da arena, definir valor individual e forma de pagamento em cada linha.
- O total é calculado pela soma dos valores individuais.
- A lista respeita a estrutura funcional do exemplo: busca/adicionar atletas, tabela de participantes, valores, pagamento e resumo; o visual segue o sistema atual.

## Financeiro

- Ao salvar, cada participante com valor maior que zero cria ou atualiza um `FinancialEntry` do tipo receita.
- Com forma de pagamento: `status = PAID`, `paidAt` preenchido e método informado.
- Sem forma de pagamento: `status = PENDING`, sem `paidAt`.
- Participante sem valor não cria lançamento.
- Alterações de valor ou forma de pagamento sincronizam o lançamento associado na mesma transação.

## Regras

- A duração modifica `endsAt` e é limitada aos intervalos configurados.
- Um novo agendamento não pode sobrepor outro na mesma quadra.
- Ações usam permissão de edição do módulo `calendar` e mantêm todo dado restrito à arena autenticada.
- Dia selecionado recebe fundo, borda e sombra de alto contraste na faixa superior.

## Verificação

- Testes cobrem schema, conflito de quadra, contrato do editor e criação de lançamento quitado/aberto.
- `npm test`, `npm run typecheck` e build passam antes do push.
