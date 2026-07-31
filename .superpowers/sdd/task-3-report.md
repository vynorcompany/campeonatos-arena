# Task 3 — Lifecycle de categorias e aplicação de rankings

## Status

Concluída. A implementação adiciona as sete ações previstas para gerir competições por categoria, sorteio em rascunho, publicação, resultados, progressão da chave e encerramento idempotente com pontuação configurável.

## Entregas

- Validação e serviço transacional para criar a competição, cadastrar duplas manuais, gerar e ajustar grupos, publicar jogos, registrar placares e finalizar.
- Elegibilidade de dupla restrita à arena, atletas ativos e distintos, classe/gênero compatíveis e ausência de duplicidade, inclusive com a ordem dos atletas invertida.
- Publicação de Liga com fase única e dos demais formatos somente quando existem exatamente oito classificadas para as quartas, criando grupos, quartas, semifinais e final.
- Reprocessamento das classificadas após resultados da fase de grupos e propagação segura dos vencedores no mata-mata.
- Rankings tipados como individual ou dupla, com bloqueios para impedir o uso cruzado nos torneios legados e nas competições de categoria.
- Pontuação de dupla por colocação configurável e crédito individual opcional no Ranking Geral.
- Aplicação persistida uma única vez por competição, protegida por índice único, transações serializáveis e repetição automática em conflito de serialização.
- Leitura e telas de ranking adaptadas para classificar e exibir duplas, torneios e ciclos de categoria.
- Cadastro de atleta ampliado com classe e gênero; exclusão bloqueada quando o atleta participa do histórico de uma dupla de categoria.
- Migração compatível com as colunas preexistentes do cadastro de atleta, backfill dos rankings legados e restrição de exclusão do histórico.

## Evidência de TDD

- RED inicial: os testes focados falharam por ausência do validator de competição, do tipo do ranking e do schema do Ranking Geral.
- REDs incrementais cobriram elegibilidade, aplicação idempotente, modelo de leitura, formulário, campos do atleta, compatibilidade de migração, transações serializáveis, histórico de duplas, interface de ranking por dupla, backfill/enforcement dos tipos e validação antecipada do Ranking Geral.
- GREEN final focado: 27 testes aprovados.
- GREEN final completo: 39 testes aprovados.

## Revisão

A revisão independente identificou riscos de corrida no lifecycle, perda de histórico ao excluir atletas, leitura incompleta do ranking de duplas, enforcement incompleto de tipos legados, escrita não atômica do perfil e configuração tardia do Ranking Geral. Todos foram corrigidos e receberam cobertura de regressão. A segunda revisão encerrou com o parecer `Ready`, sem bloqueadores de correção restantes.

## Verificação

- `npx prisma generate` — aprovado.
- `npx tsx --test tests/category-competition-actions.test.ts tests/category-ranking.test.ts tests/athlete-management.test.ts` — 27/27 aprovados.
- `npx tsx --test tests/*.test.ts` — 39/39 aprovados.
- `npm run typecheck` — aprovado.
- `npx prisma validate` — aprovado.
- `npm run lint` — aprovado, com apenas os avisos preexistentes de `<img>`.
- `npm run build` — aprovado.
- `git diff --check` — aprovado.

## Limitação do ambiente

O banco local registra a migração `20260729224930_add_athlete_profile`, que não existe no histórico deste worktree. Por isso, `prisma migrate status` acusa divergência após a última migração comum `20260730120000_category_competition_redesign`, e a migração nova não foi aplicada ao banco local. O schema foi gerado e validado, mas a execução integrada da migração precisa ocorrer em um banco com histórico alinhado.
