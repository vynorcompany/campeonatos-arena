# Redesenho da gestão de torneios

## Objetivo

Substituir a gestão atual, centrada em um torneio plano, por uma operação
centrada em evento. Um evento reúne uma ou mais categorias; cada categoria
administra as próprias inscrições, duplas, grupos, jogos e destino de ranking.
Todos os torneios são disputados exclusivamente em duplas.

## Alternativas avaliadas

1. Estender o modelo atual de um torneio com campos adicionais. É a opção de
   menor alteração imediata, mas mantém jogos, grupos e ranking no nível do
   evento e impede formatos distintos por categoria.
2. Modelar o evento e cada categoria como uma competição independente dentro
   dele. É a opção adotada: preserva um único evento e link público, mas isola
   formato, chaves, jogos e rankings de cada categoria.
3. Criar um módulo paralelo e migrar a operação depois. Reduz risco de
   regressão, mas duplica telas e regras. Não é necessário porque a migração
   pode manter os registros históricos legíveis.

## Estrutura e responsabilidades

### Evento

O evento contém nome, descrição, período, status operacional e uma URL pública
de inscrição. Ele não possui formato, grupos, partidas ou ranking próprio.
Essas decisões pertencem a cada categoria.

### Categoria do evento

Cada categoria define obrigatoriamente:

- Classe e gênero (por exemplo, `5ª Masculina`), usados para filtrar atletas
  elegíveis.
- Formato da competição.
- Ranking específico que receberá a pontuação, quando houver.
- Se também atualizará o Ranking Geral individual da arena.

Uma categoria possui suas inscrições, duplas aprovadas, grupos, classificação,
chave e partidas. Portanto, duas categorias do mesmo evento podem operar com
formatos e cronogramas independentes.

### Formatos

- **Liga:** todas as duplas enfrentam todas as demais; não há mata-mata.
- **Três grupos:** cria três grupos com o tamanho configurado para a categoria
  e, depois, mata-mata iniciado obrigatoriamente nas quartas de final.
- **Quatro grupos:** equivalente ao formato de três grupos, com quatro grupos.
  O Super 16 é o caso de quatro grupos de quatro duplas.
- **Simples:** distribui automaticamente as duplas em uma combinação de grupos
  de três e quatro duplas, buscando divisão equilibrada; em seguida cria as
  quartas de final.

Em qualquer formato com grupos e mata-mata, a chave sempre começa com oito
duplas nas quartas. A classificação usa, nesta ordem, vitórias, confronto
direto e saldo. Quando houver necessidade de completar as oito vagas, os
melhores terceiros são comparados pela mesma ordem.

Após a geração automática, a arena pode mover ou trocar duplas entre grupos
antes de publicar a tabela. A publicação congela a composição dos grupos e
gera os confrontos correspondentes.

## Inscrições e atletas

A arena pode criar uma inscrição manual, escolhendo dois atletas existentes
elegíveis para a categoria. A URL pública do evento permite selecionar a
categoria e informar uma dupla, inclusive com atletas ainda não cadastrados.

Uma inscrição externa sempre inicia como pendente. Ao aprová-la, a arena
confirma ou cria os atletas no cadastro mestre, valida classe e gênero, e
inclui a dupla na categoria. Inscrições rejeitadas não entram no sorteio.
O sistema bloqueia atleta duplicado na mesma dupla, dupla duplicada na mesma
categoria, atleta inativo e qualquer inscrição após o fechamento da categoria.

## Rankings

Um ranking é configurado previamente com:

- Tipo: **individual** ou **dupla**.
- Tabela de pontos configurável por colocação.

Cada categoria pode apontar para um ranking compatível com o resultado que
receberá. Ao encerrar a categoria, o sistema aplica os pontos de sua tabela ao
ranking selecionado. De forma independente, o responsável pode marcar que a
categoria também alimenta o Ranking Geral individual; nesse caso, cada atleta
da dupla recebe a pontuação individual prevista para sua colocação. Uma
categoria não marcada não altera o Ranking Geral.

## Fluxo operacional

1. Criar evento como rascunho.
2. Adicionar uma ou mais categorias e configurar formato, ranking e a opção de
   Ranking Geral.
3. Receber inscrições manuais e externas; aprovar as externas.
4. Fechar inscrições de uma categoria.
5. Criar duplas e gerar a divisão automática; fazer ajustes manuais.
6. Publicar grupos e partidas, registrar placares e avançar vencedores.
7. Encerrar a categoria, consolidar a colocação e atualizar os rankings
   selecionados.
8. Encerrar o evento quando todas as categorias estiverem concluídas ou
   canceladas.

## Interface

A área **Torneios** será organizada por eventos e terá um fluxo de detalhes
por etapas: Categorias, Inscrições, Duplas e grupos, Tabela/Jogos e Resultados.
O cadastro de atletas permanece exclusivamente em **Gestão → Atletas**; não
existe mais uma tela de cadastro de jogadores dentro de Torneios.

## Persistência e compatibilidade

O modelo atual já possui `Tournament`, `TournamentCategory`, `Pair`,
`TournamentGroup`, `Match` e `RankingProfile`, porém associa grupos, pares,
partidas e ranking ao evento. A implementação introduzirá uma entidade de
competição por categoria (ou referências equivalentes) para que esses dados
não sejam compartilhados entre categorias. Registros históricos continuarão
acessíveis e não serão reprocessados automaticamente.

## Erros e regras de integridade

- Não permitir publicação com menos de oito classificadas em um formato de
  mata-mata, salvo quando a categoria estiver explicitamente marcada como
  cancelada antes da publicação.
- Não permitir Liga com chave de mata-mata.
- Não permitir ranking de dupla no Ranking Geral individual.
- Exibir a causa e a ação seguinte para inscrições inválidas, duplicadas ou
  pendentes.
- Impedir alterações estruturais após publicação; ajustes posteriores exigem
  retorno explícito à etapa de configuração, antes de registrar resultados.

## Testes de aceitação

- Criar um evento com duas categorias de formatos distintos e verificar que
  seus grupos, jogos e rankings não se misturam.
- Criar Super 12 (três grupos de quatro) e Super 16 (quatro grupos de quatro),
  confirmando oito vagas nas quartas.
- Gerar divisão simples com grupos de três e quatro e validar a seleção dos
  melhores terceiros pelos três critérios definidos.
- Confirmar que Liga gera todos contra todos e nenhuma chave eliminatória.
- Aprovar uma inscrição externa com dois atletas novos e impedir a mesma dupla
  duas vezes.
- Validar os dois tipos de ranking e a atualização opcional do Ranking Geral
  individual ao fim da categoria.
