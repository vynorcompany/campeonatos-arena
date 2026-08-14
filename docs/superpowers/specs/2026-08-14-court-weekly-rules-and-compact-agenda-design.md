# Agenda compacta e regras semanais por quadra

## Objetivo

Transformar a agenda de quadras em uma área diária, densa e operacional, e permitir que a arena configure manualmente preço e disponibilidade de cada quadra para cada faixa recorrente de segunda a domingo.

## Escopo

### Agenda diária

- A rota `/agenda` deixa de exibir o cabeçalho grande e o cartão externo que consomem espaço vertical.
- Uma barra compacta no topo apresenta dias anteriores e posteriores, com o dia selecionado destacado e um atalho para hoje.
- A grade ocupa o espaço restante: horários à esquerda e uma coluna por quadra.
- Cada célula mostra o horário, a disponibilidade e o preço aplicável. Reservas, aulas e eventos continuam ocupando a célula da quadra correspondente.
- Horários sem uma faixa configurada são indisponíveis e não podem ser reservados.

### Regras semanais de quadra

- Cada regra pertence a uma única quadra e possui: dia da semana (`0` domingo a `6` sábado), horário inicial, horário final, valor em centavos e disponibilidade.
- A arena pode criar múltiplas faixas por dia e por quadra, em qualquer ordem.
- Cada quadra tem conjunto próprio de regras; não há herança global entre quadras nesta etapa.
- Faixas do mesmo dia e da mesma quadra não podem se sobrepor. Faixas consecutivas são válidas.
- O valor é usado pela agenda para apresentar o preço do horário. Cobrança, divisão entre atletas e exceções por data continuam para etapas posteriores.

### Configuração

- A rota `/agenda/configuracao` continua separada da agenda diária.
- O gestor seleciona a quadra e vê suas faixas organizadas por dia da semana.
- O formulário cria uma faixa informando dia, início, fim, preço e status de disponibilidade.
- A lista permite excluir uma faixa cadastrada. Edição de uma faixa existente ficará para a etapa seguinte; a exclusão e nova criação mantêm a primeira versão simples e auditável.

## Dados e segurança

- Novo modelo `CourtWeeklyRule`, relacionado a `Court`, com índice por quadra e dia da semana.
- As ações verificam permissão de edição do módulo `calendar` e sempre restringem a regra à arena do usuário autenticado.
- A validação server-side rejeita horários inválidos, fim anterior/inicial igual e sobreposição.

## Fora de escopo

- Exceções para datas específicas, feriados e bloqueios pontuais.
- Reserva criada pelo clique na célula.
- Cobrança, rateio e integração financeira automática.
- Edição em linha das faixas.

## Verificação

- Testes de domínio cobrem conflito e adjacência de faixas semanais.
- Testes de interface verificam a nova estrutura compacta da agenda e os controles de configuração por quadra.
- `npm test` e `npm run typecheck` devem passar antes da publicação.
