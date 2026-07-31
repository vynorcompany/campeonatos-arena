# Atalho da página pública do torneio

## Objetivo

Oferecer, no cabeçalho de cada torneio, um atalho direto para a página pública da arena, que reúne classificação e próximos jogos.

## Comportamento

- O detalhe do torneio carrega o `slug` da arena proprietária junto dos demais dados do evento.
- O cabeçalho exibe o botão **Ver página pública** ao lado das ações atuais.
- O botão abre `/classificacao/{arenaSlug}` em nova aba, sem depender do modo de inscrição do torneio.
- As regras atuais de visibilidade pública não mudam.

## Verificação

Um teste de interface confirma que a página de detalhe do torneio busca o slug da arena e renderiza o link público com abertura em nova aba.
