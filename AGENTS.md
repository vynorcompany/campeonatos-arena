# Padrão técnico do frontend

Estas instruções se aplicam a todo o frontend deste projeto, incluindo sistema interno, agência, páginas públicas e Portal.

- Use Tailwind CSS para toda apresentação, com o prefixo tw: configurado no projeto.
- Escreva utilitários no JSX ou em constantes locais reutilizáveis. Mantenha variantes responsivas e de estado junto ao componente.
- Não crie CSS Modules, folhas de estilo de apresentação, seletores globais com @apply ou adaptadores que reproduzam estilos legados por nome de classe.
- Reserve globals.css para imports/configuração do Tailwind, tokens de tema e keyframes. O CSS gerado pelo Tailwind faz parte do build.
- Estilos inline são permitidos apenas para valores efetivamente calculados em execução, como coordenadas, dimensões de recorte e cores vindas de dados; use variáveis CSS quando adequado.
- Preserve a identidade visual, a acessibilidade e os comportamentos existentes. Valide o layout renderizado em desktop e em viewport estreito.
- Mantenha um teste de contrato que impeça o retorno de folhas de apresentação e de @apply global.

## Novos menus e páginas

Todo novo menu ou página deve seguir o padrão visual existente do sistema: componentes compartilhados, escala compacta, cores, tipografia e espaçamentos consistentes, apresentação em Tailwind e validação renderizada em desktop e celular. Os acessos da página inicial de um módulo devem corresponder aos da barra lateral, respeitando as permissões.

## Campos de entidades

Campos de cliente, fornecedor e categorias de cadastro devem oferecer pesquisa e criação no contexto, usando SmartEntitySelect ou um seletor equivalente. Preserve o identificador canônico no formulário e valide permissões e arena no servidor. Em filtros públicos e seleções restritas a vínculos existentes (como responsável entre participantes), permita pesquisa e mantenha a criação no fluxo autorizado de inclusão. Enumerações estáticas não são categorias de cadastro.

## Submenus horizontais

Reutilize `submenuTabs` de `src/components/ui/submenu-tabs.ts` na navegação por abas. Os itens não têm fundo nos estados normal, hover ou selecionado; uma linha azul na base identifica a seleção, com texto em peso normal e foco de teclado visível. Preserve a semântica de navegação ou tablist e os comportamentos de URL, permissões e teclado. Esse padrão não substitui botões de ação, filtros, calendários, paginação ou a navegação principal lateral/inferior.
