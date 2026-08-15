# Configuração operacional da agenda

## Objetivo

Refazer a tela de configuração da agenda para que ela sirva à operação diária: escolha rápida de uma quadra, cadastro de uma nova quadra e configuração de várias faixas de horário sem espaços vazios ou cabeçalhos decorativos.

## Requisitos

- Remover o cabeçalho visual com “Operação”, “Configuração da agenda”, texto explicativo e botão “Ver agenda”.
- Exibir as quadras existentes numa barra horizontal compacta; a quadra ativa deve ter estado visual claro.
- Manter o cadastro de nova quadra nessa mesma barra, com campo e ação compactos.
- Ao selecionar uma quadra, mostrar somente a configuração daquela quadra no espaço principal e em largura integral.
- Manter o formulário para criar períodos recorrentes: dia, início, fim, preço e disponibilidade para a página pública.
- Organizar os dias e suas faixas em uma grade responsiva de cartões, permitindo múltiplas faixas em cada dia.
- Preservar ações existentes, validação de conflito e remoção de faixas.

## Fora de escopo

- Alterar regras de conflito, banco de dados ou endpoints.
- Alterar a agenda diária, reservas ou o modal de reserva.
