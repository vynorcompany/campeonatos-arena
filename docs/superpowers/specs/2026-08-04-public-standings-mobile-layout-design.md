# Layout mobile da classificação pública

## Objetivo

Modernizar a página pública de classificação, priorizando leitura e toque no celular sem perder a eficiência da tabela em telas maiores.

## Layout

- Cabeçalho mais compacto, com marca da arena e título em hierarquia clara.
- Abas Ranking e Jogos formam um controle segmentado de largura total no celular.
- Filtros ficam em cartões limpos e empilhados, com botão de ação proporcional.
- A tabela de classificação continua no desktop.
- Em telas móveis, cada posição vira um card: posição em destaque, dupla, resumo de jogos/vitórias e saldo visível à direita.
- Campos secundários não somem: jogos e vitórias aparecem abaixo do nome; derrotas permanecem disponíveis no resumo do card.

## Estilo

- Usar os tokens e cores existentes da Arena.
- Mais espaço em branco, bordas suaves, sombras discretas e alvos de toque de pelo menos 44px.
- Evitar aparência de tabela comprimida ou formulário legado.

## Validação

- Testes de fonte confirmam a estrutura mobile e desktop.
- Typecheck e build de produção serão executados antes do envio.

