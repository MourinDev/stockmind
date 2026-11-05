# Sugestão de reposição

A StockMind calcula a sugestão no servidor, com JavaScript e SQL. É uma análise estatística preditiva: média ponderada do consumo, estoque de segurança e sazonalidade do dia da semana. Não é aprendizado de máquina. Não há modelo treinado, nem serviço externo.

O código está em `src/lib/ia/reposicao.js`. Os parâmetros ficam no objeto `PARAMETROS_IA`. O prazo de entrega é 3 dias, o mesmo valor de `PRAZO_ENTREGA_DIAS` em `src/lib/dados.js`. O módulo de cálculo não importa esse arquivo.

## De onde vêm os dados

`vw_consumo_diario_historico` devolve, para cada produto ativo, os últimos 90 dias no fuso America/Sao_Paulo. O dia sem saída entra com quantidade zero. A série começa no dia da primeira saída: os zeros anteriores a essa data não entram na média, no desvio nem no fator semanal. Os zeros depois da primeira saída entram, porque são dias em que o produto existia no histórico e não vendeu.

Produto cuja soma de saídas no período é zero não gera sugestão.

## Fórmulas

Médias das janelas de 30, 60 e 90 dias. Se o histórico desde a primeira saída for menor que a janela, a média usa só esses dias. Não divide por 30, 60 ou 90 incluindo dias que o produto ainda não tinha saída.

```text
consumo médio = 0,5 × média30 + 0,3 × média60 + 0,2 × média90
```

Desvio padrão amostral da série diária (divisor n − 1). Com menos de dois dias, o desvio é zero.

```text
estoque de segurança = 1,65 × desvio × √3
```

1,65 é o quantil da normal para cerca de 95% de nível de serviço. O 3 é o prazo de entrega, em dias.

Com 14 dias ou mais desde a primeira saída, cada dia da semana ganha um fator:

```text
fator(dia) = média das quantidades daquele dia da semana / média simples da série
```

O dia da semana sai de `Date.UTC` e `getUTCDay()`, para a data `AAAA-MM-DD` não mudar de dia por causa do fuso do servidor. A demanda de um horizonte de H dias é a soma, a partir do dia seguinte ao último da série, de `consumo médio × fator daquele dia`. Com menos de 14 dias o fator vale 1 para todos, e o método gravado é `media_ponderada_v1`. Com sazonalidade, o método é `media_ponderada_sazonal_v1`.

```text
ponto de reposição     = teto(demanda de 3 dias + estoque de segurança)
quantidade sugerida    = max(0, teto(demanda de 10 dias + estoque de segurança − saldo))
cobertura em dias      = saldo / consumo médio
```

Os 10 dias são o prazo de entrega (3) mais a cobertura desejada (7). O teto usa quatro casas decimais antes de subir, para um resto de ponto flutuante não virar uma unidade a mais. Cobertura, desvio e média nunca são gravados como `NaN` ou infinito.

A sugestão só é gravada quando o saldo é menor ou igual ao ponto e a quantidade sugerida é maior que zero. O valor guardado em `consumo_medio_diario` é a média ponderada, não a demanda já ajustada pelo dia da semana.

## Exemplo

Noventa dias com 2 saídas por dia e saldo 4. As três médias valem 2, o desvio é 0 e o estoque de segurança é 0. Os fatores semanais valem 1.

```text
ponto        = teto(2 × 3) = 6
quantidade   = teto(2 × 10 − 4) = 16
cobertura    = 4 / 2 = 2 dias
```

Como 4 ≤ 6, a sugestão é gravada: comprar 16 unidades. O método é `media_ponderada_sazonal_v1`.

Se só os últimos 5 dias tiveram 10 saídas e o resto da janela é zero antes dessa primeira saída, as médias usam esses 5 dias. O consumo médio fica 10, não 50/90. O histórico tem menos de 14 dias, então não há fator semanal e o método é `media_ponderada_v1`. O ponto fica 30.

## O que é gravado

Uma sugestão pendente por produto. O índice único parcial `sugestoes_reposicao_pendente_produto_idx` impede a segunda pendente. Gerar de novo atualiza a pendente (novos números e nova data) em vez de falhar ou duplicar. Sugestões aceitas ou ignoradas não são alteradas.

Se o produto deixou de precisar de reposição, a pendente é apagada. Ela ainda não era uma decisão do gestor. Aceitas e ignoradas permanecem como histórico.

Aceitar ou ignorar só muda o status, e só a partir de pendente. Aceitar não cria movimentação. A entrada continua na tela de movimentações ou no QR Code.

## Limitações

- O prazo de entrega é fixo em 3 dias. Não há fornecedor nem lead time por produto.
- A sazonalidade é só o dia da semana. Feriado, mês e tendência não entram.
- O estoque de segurança supõe desvios independentes e aproximadamente normais.
- O banner do dashboard ainda usa a média simples de 15 dias (`calcularSugestaoIA`). Essa conta não é a sugestão gravada nesta tabela.
- A cobertura exibida na tela é saldo atual dividido pelo consumo médio gravado. Ela muda quando o saldo muda, mesmo sem gerar de novo.

## Evoluções possíveis

Regressão linear sobre a série diária, para enxergar tendência de alta ou queda. Holt-Winters, para tendência e sazonalidade juntas, se o histórico passar de alguns ciclos semanais. Os dois continuam sendo métodos estatísticos explicáveis, no mesmo lugar da função pura.
