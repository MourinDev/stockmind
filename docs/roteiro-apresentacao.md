# StockMind — roteiro para a banca

Projeto Integrado de Engenharia de Produto (ENSOF8AN1), Uniceplac 2026.
Sistema de controle de estoque para pequeno comércio. A sugestão de compra é estatística, calculada no servidor. Não é modelo de aprendizado de máquina.

Logins de demonstração (senha só no banco, em hash bcrypt):

| Perfil na tela | E-mail | Senha | Perfil no banco |
| --- | --- | --- | --- |
| Gestor | gestor@stockmind.com | 123456 | `admin` |
| Operador | operador@stockmind.com | 123456 | `operador` |

Abra com: `npm run dev` em http://localhost:3000.

---

## Frase de abertura (30 segundos)

O StockMind cadastra produto, registra entrada e saída, avisa estoque baixo, lê código de barras por QR Code, sugere reposição e mostra a Curva ABC. O saldo não é recalculado no JavaScript: cada movimentação entra no PostgreSQL e um trigger soma ou subtrai na mesma transação. A sessão é um cookie `httpOnly`. O operador movimenta; só o gestor cadastra, exclui e decide a sugestão.

---

## Onde está cada coisa

Se o professor apontar a tela e perguntar “onde está isso”, abra o arquivo da coluna da direita.

| O que ele vê | Arquivo | Nome no código |
| --- | --- | --- |
| Menu, cabeçalho, sino de alerta | `src/components/Layout.tsx` e `src/components/casca-app.tsx` | `produtosCriticos`, `menuAberto` |
| Estado que as telas leem | `src/components/provedor-estoque.tsx` | `usuarioLogado`, `produtos`, `movimentacoes` |
| Hook das telas | mesmo arquivo, linha 17 | `useEstoque()` |
| Tipos da tela e da API | `src/types/dominio.ts` | `ProdutoTela`, `ProdutoApi`, `ClaimsSessao` |
| Contrato do contexto | `src/types/estoque.ts` | `ValorEstoque` |
| Login | `src/components/telas/Login.tsx` chama `fazerLogin` | corpo `{ email, senha }` |
| Cookie e JWT | `src/lib/sessao.ts` | `COOKIE = 'stockmind_sessao'`, `assinarSessao`, `verificarSessao` |
| Quem pode chamar a API | `src/lib/auth.ts` | `exigirSessao(perfisPermitidos)` |
| Guarda das páginas | `src/proxy.ts` | função `proxy` (no Next 16 não é `middleware.ts`) |
| Saldo no banco | `prisma/schema.prisma`, model `Produto` | `quantidadeAtual` mapeia `quantidade_atual` |
| Quem altera o saldo | `prisma/migrations/20261105120000_init/migration.sql` | função `fn_atualizar_estoque`, trigger `tg_movimentacao_atualiza_estoque` |
| Estoque crítico | `src/lib/regras.ts` | `estaCritico`: `quantidade <= estoqueMinimo` |
| Barra de nível | `src/lib/regras.ts` | `nivelEstoque`: `quantidade / estoqueMinimo` |
| Banner do dashboard | `src/components/telas/Dashboard.tsx` linha 80 | `urgentes`, via `calcularSugestaoIA` |
| Sugestão gravada | `src/lib/ia/reposicao.ts` | `PARAMETROS_IA`, `calcularReposicao` |
| Quem grava a sugestão | `src/lib/ia/gerar-sugestoes.ts` | `gerarSugestoes`, `gravarPendente` |
| Curva ABC | `src/lib/regras.ts` | `calcularCurvaABC` |
| Validação do formulário | `src/lib/regras.ts` e `src/lib/validacao.ts` | `validarProduto` no cliente, `produtoSchema` no servidor |
| Erro de saldo | `src/lib/http.ts` | `mensagemSaldoInsuficiente`, status `422` |
| Cores e prazo de 3 dias da tela | `src/lib/dados.ts` | `PRAZO_ENTREGA_DIAS = 3`, `JANELA_ANALISE_DIAS = 15` |
| Caminhos do menu | `src/lib/rotas.ts` | `ROTAS` |

Telas, uma pasta por página:

| Tela | Rota | Componente |
| --- | --- | --- |
| Login | `/login` | `src/components/telas/Login.tsx` |
| Dashboard | `/` | `src/components/telas/Dashboard.tsx` |
| Produtos | `/produtos` | `src/components/telas/Produtos.tsx` |
| Movimentações | `/movimentacoes` | `src/components/telas/Movimentacoes.tsx` |
| QR Code | `/qrcode` | `src/components/telas/OperacaoQR.tsx` |
| Sugestão | `/ia` | `src/components/telas/InteligenciaIA.tsx` |
| Relatórios | `/relatorios` | `src/components/telas/Relatorios.tsx` |

A página em `src/app/*/page.tsx` só monta o componente. A lógica de estado está no provider.

---

## Três fluxos para desenhar no quadro

### 1. Login

1. `Login.tsx` chama `fazerLogin` no provider (`provedor-estoque.tsx`, por volta da linha 205).
2. `POST /api/auth/login` (`src/app/api/auth/login/route.ts`) valida com `loginSchema` (zod).
3. Busca o usuário pelo e-mail. Confere a senha com `bcrypt.compare` contra `senhaHash`.
4. E-mail inexistente, usuário inativo e senha errada devolvem a mesma frase: `E-mail ou senha inválidos`. Assim não se descobre se o e-mail existe.
5. `assinarSessao` cria um JWT HS256 com `sub` = id, mais `perfil` e `nome`. Expira em 8 horas (`OITO_HORAS_SEGUNDOS` em `src/lib/sessao.ts`).
6. O cookie `stockmind_sessao` sai com `httpOnly`, `sameSite=lax`, `path=/`. `secure` só em produção. O segredo é `SESSION_SECRET`. Ele não tem prefixo `NEXT_PUBLIC_`, então não vai para o navegador.
7. O JavaScript da página não lê o token. O navegador envia o cookie sozinho (`credentials: 'include'` na função `api` do provider).

Há duas checagens, de propósito:

- `src/proxy.ts` só olha o JWT, sem banco. Página sem sessão vai para `/login`. Rota `/api` não é redirecionada, senão o `fetch` receberia HTML.
- Cada rota de API chama `exigirSessao`. Sem sessão: `401`. Perfil errado: `403`. Aí sim o usuário é relido no banco (`lerSessao` em `src/lib/auth.ts`). Se foi desativado, a API recusa mesmo com cookie ainda válido.

`cargo` (“Gestor” ou “Operador”) existe só no texto do cabeçalho. A função `cargoDe` no provider traduz `admin` → `Gestor`. Quem autoriza é `perfil`, vindo do banco, não um campo que o navegador manda.

### 2. Saída de estoque

1. A tela chama `registrarMovimentacao`.
2. O provider manda `POST /api/movimentacoes` com `produtoId`, `tipo` (`entrada` ou `saida`) e `quantidade`. Não manda preço nem id de usuário.
3. A rota (`src/app/api/movimentacoes/route.ts`) exige sessão de `admin` ou `operador`.
4. O preço sai do produto no servidor: entrada usa `valorCusto`, saída usa `valorVenda`. O `usuarioId` sai de `acesso.sessao.id`.
5. O `INSERT` dispara `fn_atualizar_estoque`. A função trava a linha (`FOR UPDATE`), soma a entrada ou, na saída, compara `saldo` com `NEW.quantidade`. Se não cabe, a transação inteira falha com a frase que contém “Saldo insuficiente”.
6. `mensagemSaldoInsuficiente` em `src/lib/http.ts` transforma isso em HTTP `422`.
7. O provider substitui o produto na lista `produtos` pelo que a API devolveu. Dashboard, alertas e Curva ABC leem a mesma lista, então atualizam juntos.

Movimentação não tem `PATCH` nem `DELETE`. O trigger `tg_movimentacao_imutavel` recusa os dois. O histórico é a base do relatório e da sugestão.

Produto excluído não some: `DELETE /api/produtos/{id}` põe `ativo = false`. A linha e o histórico ficam. Só `admin` cadastra, edita e desativa. O operador consulta e movimenta.

A quantidade do formulário não entra no `POST` do produto. O saldo nasce 0. Se o gestor informa quantidade inicial, o provider grava uma entrada com observação `Quantidade inicial`. Se edita e o número muda, a diferença vira entrada ou saída com observação `Ajuste de inventário` (`salvarProduto`, por volta da linha 281).

### 3. Sugestão de reposição

1. Só o gestor chama `POST /api/ia/gerar`.
2. `gerarSugestoes` lê produtos ativos e a view `vw_consumo_diario_historico` (últimos 90 dias, fuso America/Sao_Paulo, dia sem venda = 0).
3. Para cada produto chama `calcularReposicao`. Função pura: não lê banco.
4. Grava no máximo uma sugestão `pendente` por produto. O índice único parcial `sugestoes_reposicao_pendente_produto_idx` faz o `ON CONFLICT` atualizar a pendente em vez de duplicar.
5. Aceitar ou ignorar é `PATCH /api/ia/sugestoes/{id}`. Só muda `status`, e só a partir de `pendente`. Não cria movimentação. A compra entra depois, na tela de movimentações ou no QR Code.

---

## A pergunta que mais pega: “cadê a IA?”

Existem duas contas. Fale as duas antes que perguntem.

**A que vale, gravada no banco**, está em `src/lib/ia/reposicao.ts`, objeto `PARAMETROS_IA`:

```text
consumo médio     = 0,5 × média de 30 dias + 0,3 × média de 60 + 0,2 × média de 90
estoque segurança = 1,65 × desvio amostral × √3
ponto             = teto(demanda de 3 dias + estoque de segurança)
quantidade        = max(0, teto(demanda de 10 dias + estoque de segurança − saldo))
cobertura         = saldo / consumo médio
```

Nomes no retorno de `calcularReposicao`: `consumoMedioDiario`, `desvioPadrao`, `estoqueSeguranca`, `pontoReposicao`, `quantidadeSugerida`, `coberturaDias`, `metodo`, `sugerir`.

- `1,65` é `nivelServicoZ`: quantil da normal para cerca de 95% de nível de serviço.
- `3` é `prazoEntregaDias`. Os 10 dias são esse prazo mais `diasCobertura` (7).
- `sugerir` só é verdadeiro se `saldoAtual <= pontoReposicao` e `quantidadeSugerida > 0`.
- Com 14 dias ou mais (`minimoDiasSazonalidade`), cada dia da semana ganha um fator. O método gravado vira `media_ponderada_sazonal_v1`. Abaixo disso, o fator é 1 e o método é `media_ponderada_v1`.
- O dia da semana sai de `diaDaSemanaISO`, com `Date.UTC`, para o fuso do servidor não mudar o dia.
- Zeros antes da primeira saída não entram na média. O corte é a variável `inicio` (`serie.findIndex`).
- Testes: `npm test` roda `src/lib/ia/reposicao.test.ts`, sem banco.

**A do banner do dashboard** é outra. `calcularSugestaoIA` em `src/lib/regras.ts` usa média simples dos últimos 15 dias (`JANELA_ANALISE_DIAS`). O dashboard chama isso na linha 80 e guarda em `urgentes`. Essa conta não é a linha da tabela `sugestoes_reposicao`. Se perguntarem “por que o banner não bate com a tela de sugestão”, a resposta é essa.

A cobertura mostrada na lista de sugestões é recalculada na leitura, em `sugestaoApi` (`src/lib/ia/apresentar.ts`): saldo atual dividido pelo consumo médio já gravado. Muda quando o saldo muda, mesmo sem gerar de novo.

O gráfico da tela de sugestão é `projetarEstoque` (`src/lib/regras.ts`): saldo menos consumo médio vezes o dia, horizonte `HORIZONTE_PROJECAO = 30` em `InteligenciaIA.tsx`.

---

## Curva ABC

Função `calcularCurvaABC` em `src/lib/regras.ts`. A tela é `Relatorios.tsx`, variável `curva`.

```text
valorTotal        = quantidade × valorUnitario
percentual        = valorTotal / valorGeral × 100
percentualAcumulado = soma até o item
```

A classe olha `acumuladoAntes`, o acumulado de antes de somar o próprio item:

- menor que 80 → classe `A`
- menor que 95 → classe `B`
- o resto → classe `C`

O item que cruza 80% ainda entra em A. Por isso a comparação é com `acumuladoAntes`, não com `acumulado`.

O CSV sai de `baixarCSV`: separador `;` e BOM, para o Excel em português.

---

## Banco, em uma frase cada

Terceira forma normal: categoria é tabela, não texto repetido no produto. Usuário da movimentação é chave (`usuarioId`), não um nome solto.

`valorUnitario` em `movimentacoes` é foto do preço na hora. Se o preço do produto mudar, o relatório antigo continua válido.

Não há tabela de fornecedor. O prazo de 3 dias é constante. Não há tabela de alerta: estoque baixo é a view `vw_produtos_estoque_baixo` (`quantidade_atual <= estoque_minimo` e `ativo`).

`ON DELETE RESTRICT` nas relações com histórico: não se apaga produto ou usuário que já tem movimentação. A exclusão da tela é `ativo = false`.

Views usadas pelo dashboard e pelos relatórios estão em `src/lib/queries.ts`, via `prisma.$queryRaw`. O diagrama está em `db/README.md`.

O client Prisma gerado fica em `src/generated/prisma/`. Não se edita à mão.

Uma linha de `db/README.md` está velha: diz que as telas ainda usam dados locais. O código não usa mais mock. `src/lib/dados.ts` guarda só cores, categorias da tela e os parâmetros `JANELA_ANALISE_DIAS` e `PRAZO_ENTREGA_DIAS`. Produto e histórico vêm da API.

---

## Perguntas com resposta curta

**O que o sistema faz?** Controla estoque de pequeno comércio: cadastro, entrada, saída, alerta de mínimo, QR Code, sugestão de compra e Curva ABC.

**Qual a stack?** Next.js 16 (App Router), React 19, TypeScript, Tailwind, Prisma 7, PostgreSQL no Neon, zod, jose para o JWT, bcryptjs para a senha, Recharts nos gráficos. Sem NextAuth.

**Por que `proxy.ts` e não `middleware.ts`?** No Next.js 16 o interceptador de requisição deste projeto é `src/proxy.ts`, função `proxy`. Ele só decide redirect de página. Autorização da API fica em `exigirSessao`.

**Onde fica a sessão?** Cookie `stockmind_sessao`, JWT HS256, 8 horas. Assinatura em `assinarSessao`. Leitura em `verificarSessao`. Conferência com o banco em `lerSessao`.

**O navegador consegue ler o token?** Não. O cookie é `httpOnly`. O payload que a página conhece é o JSON de `GET /api/auth/me`: id, nome, e-mail, perfil. Sem `senhaHash`.

**Onde está a senha?** Coluna `senha_hash`, no código `senhaHash` do model `Usuario`. Nunca volta no JSON. A comparação é `bcrypt.compare` na rota de login.

**Por que a mensagem de login é sempre a mesma?** Para não revelar se o e-mail existe. A constante é `MENSAGEM` em `src/app/api/auth/login/route.ts`.

**Quem é admin e quem é operador?** Enum `PerfilUsuario`: `admin` e `operador`. Na tela, `cargoDe` mostra Gestor ou Operador. Operador não cadastra, não edita, não desativa e não gera nem aceita sugestão. Ele lista e registra movimentação.

**Onde está a quantidade?** No banco, `produtos.quantidade_atual`. No Prisma, `quantidadeAtual`. Na tela, `ProdutoTela.quantidade`, preenchida por `produtoTela` no provider (`quantidade: produto.quantidadeAtual`). Estoque mínimo: `estoqueMinimo` / `estoque_minimo`.

**Quem muda o saldo?** Só o trigger `fn_atualizar_estoque`, depois do `INSERT` em `movimentacoes`. A aplicação não faz `quantidade = quantidade - saida` em JavaScript. A variável local do trigger que segura o saldo antes da conta é `saldo`.

**O que acontece se a saída for maior que o saldo?** O trigger dá `RAISE EXCEPTION` com “Saldo insuficiente”. A API responde `422`. O regex está na constante `SALDO` em `src/lib/http.ts`.

**Dá para corrigir uma movimentação errada?** Não por update. O histórico é imutável (`fn_bloquear_alteracao_movimentacao`). O caminho é lançar uma movimentação inversa.

**Excluir produto apaga a linha?** Não. `ativo = false`. Por isso o histórico da IA e dos relatórios não quebra.

**Onde está o preço?** Dois campos no produto: `valorCusto` e `valorVenda`. O formulário tem um só, `valorUnitario`. No cadastro os dois recebem esse valor. Na edição só a venda muda; o custo fica, para não apagar a margem do seed. Na tela, `produtoTela` usa `valorVenda` como `valorUnitario`.

**O QR Code é o quê?** A coluna `qr_code`, no código `qrCode`. No cadastro recebe o mesmo texto do `codigo`. A busca é `GET /api/produtos/codigo/{codigo}`. O “bip” é `tocarBip` em `regras.ts` (oscilador do navegador, 1400 Hz). Não é um arquivo de áudio. O leitor da demo é simulado na tela.

**Isso é inteligência artificial?** É análise estatística: média ponderada, desvio, estoque de segurança e fator por dia da semana. Não há modelo treinado nem API externa. O cálculo puro está em `calcularReposicao`. Os parâmetros estão em `PARAMETROS_IA`.

**Onde está o 1,65? Onde está o prazo de 3 dias? Onde estão os pesos 0,5 / 0,3 / 0,2?** Todos em `PARAMETROS_IA`: `nivelServicoZ`, `prazoEntregaDias`, `pesos`. As janelas estão em `janelas: [30, 60, 90]`. O 3 da tela antiga, usado pelo banner, é `PRAZO_ENTREGA_DIAS` em `src/lib/dados.ts`. Os dois valem 3, mas são constantes diferentes. O módulo `reposicao.ts` não importa `dados.ts`.

**Onde está a média de 15 dias?** `JANELA_ANALISE_DIAS` em `dados.ts`, usada só por `calcularSugestaoIA`. Não entra na sugestão gravada.

**Aceitar a sugestão compra o produto?** Não. `decidirSugestao` manda `PATCH` com `{ status: "aceita" }` ou `"ignorada"`. Status diferente de pendente responde `409`. A entrada continua em `POST /api/movimentacoes`.

**Por que não gera sugestão para produto sem saída?** `calcularReposicao` retorna `null` quando `inicio < 0` (nenhuma quantidade maior que zero) ou quando `consumoMedio` não é positivo. O resumo conta isso em `puladasSemConsumo`.

**O que é `sugerir`?** Booleano no retorno de `calcularReposicao`. Verdadeiro quando o saldo já chegou no ponto e a quantidade a comprar é maior que zero. Se for falso, a pendente daquele produto é apagada (`puladasSemNecessidade`). Aceitas e ignoradas ficam como histórico.

**Onde está a classe A, B e C?** Dentro de `calcularCurvaABC`, variável `classe`, decidida por `acumuladoAntes`.

**Onde a validação acontece?** Duas vezes. No cliente, `validarProduto` antes do fetch, para pintar o campo. No servidor, `produtoSchema` e `movimentacaoSchema` em `src/lib/validacao.ts`. Erro de zod vira `400` com `{ erro, campos }`, montado por `errosZod`.

**O que o cliente não pode mandar?** Perfil, senha de outra pessoa, preço da movimentação, `usuarioId` e `quantidadeAtual` no cadastro. Tudo isso é resolvido no servidor.

**Como o dashboard sabe o que está crítico?** `produtosCriticos` no provider: `produtos.filter(estaCritico)`, ordenado por `nivelEstoque` (o mais grave primeiro). O sino usa o tamanho dessa lista.

**O estado é global como?** React Context. `ProvedorEstoque` envolve a árvore em `src/app/layout.tsx`. `CascaApp` lê `useEstoque` para menu, sessão e aviso.

**Recarregar a página perde o login?** Não. O cookie permanece. No mount, o provider chama `GET /api/auth/me`. A flag `sessaoPronta` impede a casca de mandar para o login antes dessa resposta.

**O que acontece se o banco cair no meio da tela?** `erroCarga` no provider. A casca mostra o texto em vermelho. A função que busca é `carregarDados`.

**Por que Decimal vira número?** JSON não carrega o tipo `Decimal` do Prisma. `numero()` em `src/lib/http.ts` chama `toNumber()` antes de responder.

**Onde estão os testes?** `src/lib/ia/reposicao.test.ts`. Cobrem a conta pura, sem Neon. `npm run typecheck` é a checagem de tipos.

**Qual a limitação que você assumiria se perguntarem?** Prazo de entrega fixo em 3 dias, sem fornecedor. Sazonalidade só por dia da semana. Estoque de segurança supõe desvios independentes e aproximadamente normais. O banner do dashboard ainda usa a média de 15 dias. O formulário tem um preço só, então no cadastro custo e venda nascem iguais.

---

## Roteiro de 8 minutos na frente da turma

1. Entrar como gestor. Mostrar o dashboard: saudação, banner, gráfico, sino de estoque crítico.
2. Abrir um produto crítico e dizer a regra: `quantidade <= estoqueMinimo`, função `estaCritico`.
3. Lançar uma saída maior que o saldo. Mostrar o campo vermelho e, se gravar, o `422`. Dizer que quem recusa é o trigger, não um `if` solto na tela.
4. Lançar uma saída válida. Mostrar o saldo novo no dashboard sem recarregar, porque a lista `produtos` é a mesma.
5. Abrir a Curva ABC e falar `acumuladoAntes`, classes 80% e 95%.
6. Abrir a sugestão. Gerar. Explicar os pesos 0,5 / 0,3 / 0,2 e que aceitar não dá entrada.
7. Sair e entrar como operador. Mostrar que cadastrar produto e gerar sugestão não aparecem ou a API responde `403`.

Se pedirem para abrir o código na hora, a ordem segura é: `provedor-estoque.tsx` (estado) → `sessao.ts` (cookie) → `fn_atualizar_estoque` na migration (saldo) → `PARAMETROS_IA` (fórmula).
