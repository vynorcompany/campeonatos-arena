# Agenda densa, modal de horário e navegação enxuta

## Objetivo

Eliminar os espaços vazios da agenda e da configuração de quadras, tornar o dia visualmente inequívoco e abrir detalhes do horário sem retirar o gestor da grade.

## Agenda

- A faixa de datas mantém sete dias, com a data visualizada sempre no centro.
- O dia central recebe uma cápsula de seleção; quando corresponder à data atual, recebe também a indicação `Hoje`.
- A agenda usa a altura útil da tela e linhas compactas, sem área vazia abaixo da grade.
- Cada horário de uma quadra é clicável, esteja disponível, indisponível ou ocupado.
- O clique abre um modal central sobre a agenda, com fundo desfocado. O modal identifica quadra, data, início/fim, preço e estado do horário. Para ocorrências também mostra título e tipo.
- Esta etapa não cria reservas pelo modal; ela estabelece a interação e o contexto necessário para o formulário de reservas seguinte.

## Gestão de quadras

- A configuração apresenta um seletor explícito `Quadra selecionada` no topo do editor.
- O editor da quadra selecionada permite múltiplas faixas por dia da semana, com início, fim, preço e `Disponível para reserva online`.
- A lista compacta permanece agrupada por dia e sem regiões vazias artificiais.
- A disponibilidade online é a mesma disponibilidade persistida da regra semanal nesta etapa; a futura página pública deve respeitá-la.

## Navegação lateral

- O menu mantém somente: Dashboard, Torneios, Tela da TV, Atletas e Configurações.
- Torneios preserva Jogos e Rankings como submenus.
- Tela da TV preserva Configurar slides e Abrir TV como submenus.
- Configurações preserva Arena, Regulamento, Usuários (quando permitido), Minha conta e passa a incluir Agenda de quadras e Configuração da agenda.
- Rotas removidas do menu continuam existentes e protegidas; somente deixam de aparecer no painel lateral.

## Verificação

- Testes de interface verificam data central selecionada, modal de horário, seletor de quadra e navegação reduzida.
- `npm test`, `npm run typecheck` e build de produção devem passar antes do push.
