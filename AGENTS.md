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
