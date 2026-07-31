# Filtro de período dos rankings

## Objetivo

Permitir consultar a classificação de cada ranking por período, sem perder o contexto ao alternar entre suas abas.

## Experiência

- O padrão ao abrir um ranking será **Mês atual**.
- Uma barra compacta exibirá os atalhos: **Mês atual**, **Trimestre atual**, **Semestre atual** e **Ano atual**.
- **Personalizado** abre data inicial e final.
- **Ciclos** permite selecionar uma temporada configurada para o ranking e criar ciclos nomeados, como `2º semestre 2026`.
- A seleção é preservada em Configuração, Pontuação, Classificação e Uso.

## Regras

- Todos os períodos usam limites inclusivos de data e são calculados no fuso da arena.
- Os atalhos são relativos à data atual; trimestre começa em janeiro, abril, julho ou outubro; semestre em janeiro ou julho.
- O período personalizado exige início menor ou igual ao fim.
- Ciclos permanecem compatíveis com os ciclos existentes; novos ciclos têm nome, início e término opcional.
- Classificação e Uso consultam exclusivamente os dados dentro do período ativo.

## Escopo

- Não alterar regras de pontos, resultados ou classificação pública.
- Não alterar os dados históricos já persistidos.

## Validação

- Testar cálculo de cada atalho, limites de período personalizado, seleção de ciclo e preservação entre abas.
- Executar typecheck, suíte completa e build local.
