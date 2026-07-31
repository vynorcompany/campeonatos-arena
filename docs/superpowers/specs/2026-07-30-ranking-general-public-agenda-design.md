# Ranking Geral, agenda pública e refinamento de jogos

## Objetivo

Consolidar a regra de alimentação do Ranking Geral no próprio Ranking, tornar a edição de eventos evidente, simplificar a operação de jogos e permitir que atletas consultem a agenda de partidas em uma única página pública.

## Escopo aprovado

### 1. Ranking que alimenta o Geral

- O cadastro e a edição de um perfil de ranking terão a opção selecionável **"Alimenta o Ranking Geral"**.
- Apenas rankings de duplas poderão habilitar essa opção, pois o Ranking Geral da arena é individual.
- Uma categoria que escolher um ranking marcado com essa opção herdará a alimentação do Ranking Geral automaticamente.
- A configuração manual `feedsGeneralRanking` deixará de ser editável na categoria. A tela da categoria exibirá apenas o estado herdado, para evitar divergência entre Ranking e categoria.
- A regra de pontuação do Ranking Geral continua a usar a tabela de pontos do ranking de duplas selecionado e credita os dois atletas de cada dupla.
- Dados existentes serão preservados: rankings que já tenham categorias configuradas para alimentar o Geral serão migrados/ajustados de forma segura para manter o comportamento atual.

### 2. Edição de evento

- A página de detalhes do evento terá uma ação discreta **"Editar evento"**.
- O formulário permitirá alterar nome e descrição do evento existente.
- A alteração não modifica categorias, partidas, duplas, histórico ou o status do evento.
- O acesso continuará protegido pela permissão de edição de torneios e pela arena proprietária.

### 3. Tela interna de Jogos

- O fluxo continua: escolher evento em operação, escolher categoria daquele evento e abrir o espaço de lançamento da categoria.
- O botão/atalho **"Ver classificação completa"** será removido do fluxo de jogos.
- A listagem de partidas será reorganizada em linhas compactas e escaneáveis, priorizando: data e hora, fase/grupo, confronto, placar/status e ação de edição.
- A apresentação manterá categorias isoladas; nunca haverá confrontos ou resultados misturados entre categorias.

### 4. Página pública única

- A rota pública existente da arena continua sendo a única página pública de classificação.
- O seletor mantém o Ranking Geral e as classificações de categorias públicas concluídas.
- Abaixo da classificação será adicionada a seção **"Próximos jogos"**, sem exigir outra rota ou troca de seletor.
- A agenda incluirá partidas de categorias marcadas como públicas mesmo enquanto o evento estiver em andamento.
- Cada item mostrará evento, categoria, fase/grupo quando existente, nomes das duas duplas e data/hora previstas.
- Apenas jogos com data e hora completas serão exibidos.
- Os jogos serão agrupados por dia em ordem cronológica; dentro de cada dia, serão ordenados por hora crescente. Empates serão estabilizados por evento, categoria e ordem da partida.
- Jogos finalizados não aparecem como próximos jogos. Categorias privadas e arenas diferentes nunca são expostas.
- A classificação de uma categoria permanece pública somente após ela estar encerrada, como definido anteriormente.

## Arquitetura

1. **Persistência de ranking**: adicionar uma propriedade explícita ao `RankingProfile`, com validação para tipo `PAIR` e proteção de arena. A criação/edição de competição resolve a regra a partir do ranking selecionado no servidor.
2. **Serviço público**: ampliar o serviço de classificação pública com uma consulta separada, filtrada por arena, visibilidade da categoria, status não finalizado e agendamento completo. Um conversor puro agrupa e ordena a agenda para a interface.
3. **Interface**: manter os componentes de Ranking, evento, categoria e página pública com responsabilidades separadas. A página de Jogos reutiliza o workspace da categoria para lançamento, mas sem ações de classificação concorrentes.

## Segurança e regras de consistência

- Toda leitura e escrita usa `arenaId` no limite do serviço/consulta.
- Alterar um ranking que alimenta o Geral não cria lançamentos retroativos e não reprocessa categorias encerradas; influencia somente competições configuradas ou atualizadas daí em diante.
- Se um ranking não alimentar o Geral, a categoria não poderá habilitar essa regra por conta própria.
- A página pública não expõe dados cadastrais dos atletas, pontuação interna de ranking de duplas, controles administrativos ou jogos sem agendamento completo.

## Testes e verificação

- Validar os cenários de criação e edição de ranking de duplas e a rejeição para ranking individual.
- Validar que a categoria herda a regra do ranking e não aceita uma combinação divergente enviada pelo cliente.
- Testar autorização e escopo de arena para edição do evento e configuração de ranking.
- Testar filtro público da agenda: categoria privada, categoria de outra arena, jogo encerrado ou data/hora incompletas não aparecem.
- Testar agrupamento por dia e ordenação por hora.
- Executar a suíte de testes, typecheck, build e uma verificação HTTP do servidor local antes da entrega.
