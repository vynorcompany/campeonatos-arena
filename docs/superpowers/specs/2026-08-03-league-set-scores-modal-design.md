# Placar por sets em partidas de Liga

## Objetivo

Permitir que partidas de categorias no formato **Liga** registrem o placar de até três sets, com uma edição organizada em janela flutuante ao selecionar o jogo.

## Escopo

- O recurso se aplica exclusivamente a partidas cuja competição usa o formato Liga.
- Cada jogo terá três pares de campos numéricos: Set 1, Set 2 e Set 3.
- O Set 3 é opcional e representa o desempate.
- O valor de cada set é livre; a arena pode utilizar sets até 6, super tie-break até 10 ou outra regra interna.
- A partida é encerrada somente quando uma dupla tiver vencido dois sets.
- Partidas de mata-mata permanecem com o fluxo de placar atual.

## Interação

Na lista de jogos de Liga, clicar no card da partida abre uma janela flutuante centralizada.

A janela exibirá:

- identificação do jogo e fase;
- nomes das duas duplas;
- uma grade de placares com proporções alinhadas: colunas para Set 1, Set 2 e Set 3; linhas para cada dupla;
- o status atual;
- ações de cancelar e salvar resultado.

O card continuará exibindo data, duplas, status e um resumo compacto dos sets registrados. Controles de agenda e status não abrem a janela por engano.

## Persistência e regras

A partida armazenará os placares individuais dos três sets. Os campos agregados de placar existentes serão preservados como resultado da partida para manter classificação, saldo e integrações atuais.

Ao salvar:

- Set 1 e Set 2 são obrigatórios;
- Set 3 só pode ser preenchido quando cada dupla venceu um dos dois primeiros sets;
- nenhum set pode terminar empatado;
- a dupla vencedora é calculada pela contagem de sets vencidos;
- resultados já existentes permanecem legíveis e editáveis.

## Visual

A janela usará o mesmo sistema visual da Arena: fundo de sobreposição translúcido, painel com bordas e espaçamento atuais, hierarquia tipográfica clara e botões coerentes com o restante do sistema. A grade se adapta para celular sem campos apertados ou desalinhados.

## Validação

- Testes unitários cobrirão a contagem de sets, terceiro set opcional e entradas inválidas.
- Testes de interface cobrirão a abertura da janela e os três campos em partidas de Liga.
- Typecheck e build de produção serão executados antes do envio.

