# Regras visuais do painel

## Escala compacta

Painéis operacionais devem ser confortáveis para leitura prolongada e uso diário. Os elementos não devem ser grandes ou grotescos: espaço vazio, altura de cartões, tamanho de ícones e dimensões de botões precisam ser proporcionais ao conteúdo.

- Priorize cartões compactos, com alturas próximas ao conteúdo e sem áreas vazias decorativas.
- Use botões de ação com altura padrão compacta (em geral 40–48 px). Botões altos são reservados a ações realmente excepcionais.
- Ícones devem apoiar a leitura, não dominar o painel: prefira 16–24 px nos controles e até 52 px em cartões-resumo.
- Títulos devem estabelecer hierarquia sem ocupar desproporcionalmente a tela; use tamanhos moderados e espaçamento consistente.
- Em telas largas, mantenha densidade visual equilibrada. Não aumente paddings, grades ou componentes apenas porque há espaço disponível.
- Em telas pequenas, reorganize o conteúdo em vez de ampliar controles ou criar blocos vazios.

Antes de concluir uma alteração visual, compare a escala entre cabeçalho, ações, cartões e conteúdo. Se um único elemento parece chamar atenção apenas por ser grande, reduza-o.

## Tailwind obrigatório no sistema e no Portal

Toda apresentação usa utilitários Tailwind com o prefixo `tw:`, no JSX ou em constantes locais e primitivas compartilhadas. Variantes responsivas e de estado ficam junto aos componentes. Não introduza CSS Modules, folhas de apresentação ou seletores globais com `@apply`.

Reserve `globals.css` para os imports e a configuração do Tailwind, tokens de tema e keyframes. Valores realmente calculados em execução podem usar variáveis CSS ou estilos dinâmicos. Valide os estados, os formulários e o layout renderizado em desktop e em viewport estreito antes de publicar.

## Novos menus e páginas

Todo novo menu ou página deve seguir o padrão visual existente do sistema: componentes compartilhados, escala compacta, cores, tipografia e espaçamentos consistentes, apresentação em Tailwind e validação renderizada em desktop e celular. Os acessos da página inicial de um módulo devem corresponder aos da barra lateral, respeitando as permissões.
