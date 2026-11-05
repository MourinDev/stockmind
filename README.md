# StockMind: front-end

Sistema inteligente de controle de estoque para pequenos comércios.
Projeto Integrado de Engenharia de Produto (ENSOF8AN1), Uniceplac 2026.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # gera a versão de produção
npm run start      # serve a versão gerada por build
npm test           # cálculo de reposição, sem banco
```

Logins de demonstração (a senha está só no banco, com hash bcrypt):

| Perfil   | E-mail                 | Senha  |
|----------|------------------------|--------|
| Gestor   | gestor@stockmind.com   | 123456 |
| Operador | operador@stockmind.com | 123456 |

Antes de `npm run dev`, copie `.env.example` para `.env` e preencha `DATABASE_URL`, `DIRECT_URL` e `SESSION_SECRET`. O segredo da sessão não pode ir para o cliente: gere com `openssl rand -base64 32` e não use o prefixo `NEXT_PUBLIC_`.

Stack: Next.js 16 (App Router) + React 19 + TypeScript, Prisma 7, PostgreSQL (Neon), Tailwind CSS, Recharts, lucide-react, qrcode-generator, `jose` (sessão) e `zod` (validação). Sem NextAuth.

## Arquitetura e explicação para a banca

### Organização das pastas

```
src/
├── app/
│   ├── layout.tsx          fonte, CSS global, provider e casca (menu + cabeçalho)
│   ├── page.tsx            TELA 1: /
│   ├── login/page.tsx      TELA 0: /login
│   ├── produtos/page.tsx   TELA 2: /produtos
│   ├── movimentacoes/page.tsx
│   ├── qrcode/page.tsx
│   ├── ia/page.tsx
│   ├── relatorios/page.tsx
│   └── globals.css
├── components/
│   ├── provedor-estoque.tsx  estado global e camada de dados (as ações que alteram o estoque)
│   ├── casca-app.tsx         menu, cabeçalho e proteção das rotas sem sessão
│   ├── ui.tsx                peças visuais reutilizáveis (cartão, botão, campo, modal, selos...)
│   ├── Layout.tsx            menu lateral, cabeçalho e central de alertas
│   ├── QRCode.tsx            geração do QR Code e da etiqueta de prateleira
│   └── telas/
│       ├── Login.tsx           TELA 0: autenticação
│       ├── Dashboard.tsx       TELA 1: indicadores, gráficos e alertas
│       ├── Produtos.tsx        TELA 2: cadastro com validações
│       ├── Movimentacoes.tsx   TELA 3: entradas e saídas
│       ├── OperacaoQR.tsx      TELA 4: leitor de QR Code e etiquetas
│       ├── InteligenciaIA.tsx  TELA 5: sugestão de reposição e projeção de ruptura
│       └── Relatorios.tsx      TELA 6: Curva ABC (Pareto) e histórico com CSV
└── lib/
    ├── dados.ts              cores, categorias da tela e parâmetros da IA
    ├── regras.ts             regras de negócio puras: Curva ABC, IA, validações, CSV
    └── rotas.ts              ids do menu e caminhos do App Router
```

- **`dados.ts`**: cores dos gráficos, lista de categorias do formulário e parâmetros da IA. Os produtos e o histórico vêm do banco (veja `docs/api.md`).
- **`regras.ts`**: funções puras (`calcularCurvaABC`, `calcularSugestaoIA`, `projetarEstoque`, `validarProduto`, `baixarCSV`). O dashboard, os relatórios e a IA ainda calculam no cliente com essas funções.
- **`provedor-estoque.tsx`**: busca e grava pela API e devolve o mesmo formato de antes para as telas. A sessão é o cookie `stockmind_sessao`. Recarregar a página mantém o login.

### Destaques visuais para mostrar na apresentação

- Dashboard com banner da IA, gráfico de entradas e saídas, rosca de valor por categoria, alertas com barra de nível, mais vendidos e atividade recente.
- Sino de alertas no cabeçalho com os itens em estoque crítico.
- Na movimentação, prévia do saldo antes de gravar. Se a saída não cabe no saldo, o campo fica vermelho na hora.
- Leitor de QR Code simulado com mira, linha de varredura, "bip" e clarão na leitura.
- Na IA, gráfico de projeção de ruptura: o saldo previsto dia a dia, com as linhas do estoque mínimo e do prazo de entrega.
- Na Curva ABC, gráfico de Pareto: barras com o % de cada item e linha com o % acumulado, com as faixas de 80% e 95%.
- No celular, o menu vira gaveta e as tabelas de produtos viram cartões.
- As cores dos gráficos foram conferidas para daltonismo, e quem ativa "reduzir movimento" no sistema vê tudo sem animação.

### Como os estados se conectam

O `ProvedorEstoque` é o dono de três estados principais, que espelham as tabelas do PostgreSQL:

- `usuario`: `{ id, nome, email, perfil, cargo }`. `cargo` é "Gestor" ou "Operador", só para o texto do cabeçalho. O perfil que autoriza a API é o do banco, não o que o navegador envia.
- `produtos`: `{ id, codigo, descricao, categoria, quantidade, estoqueMinimo, valorUnitario }`
- `movimentacoes`: `{ id, produtoId, tipo, quantidade, dataOcorrencia, observacao, usuarioResponsavel }`

As telas recebem esses dados por props e nunca alteram o estado direto. Elas chamam as ações do `ProvedorEstoque`:

| Ação                    | O que faz                                                        |
|-------------------------|------------------------------------------------------------------|
| `fazerLogin` / `sair`   | Autentica e encerra a sessão                                     |
| `salvarProduto`         | Valida e cadastra ou edita um produto                            |
| `excluirProduto`        | Desativa o produto (`ativo = false`). A linha e o histórico ficam |
| `registrarMovimentacao` | Grava a movimentação e atualiza o saldo do produto               |

Como tudo parte do mesmo estado, um registro feito pelo leitor de QR Code ou pela IA aparece na hora no Dashboard, nos alertas, na Curva ABC e no histórico.

**Regra crítica do estoque:** a API só insere a movimentação. Um trigger do PostgreSQL soma a entrada, subtrai a saída e recusa saldo negativo. A aplicação não recalcula o saldo em JavaScript. O operador consulta produtos, mas não cadastra, edita nem exclui.

**Validações do cadastro:** campos obrigatórios, código duplicado (sem diferenciar maiúsculas), quantidade e estoque mínimo negativos ou fracionados, e valor unitário menor ou igual a zero. Cada erro aparece em vermelho embaixo do campo.

### Fórmula da StockMind IA

A sugestão gravada no banco está descrita em [docs/ia.md](docs/ia.md): média ponderada de 30, 60 e 90 dias, estoque de segurança e fator por dia da semana. Aceitar a sugestão não dá entrada no estoque.

O banner do dashboard ainda usa a média simples dos últimos 15 dias, em `calcularSugestaoIA`. Essa conta não é a sugestão persistida.

### Fórmula da Curva ABC

```
valor total do item = quantidade x valor unitário
ordenar os itens do maior para o menor valor total
% do item           = valor do item / valor total do estoque x 100
% acumulado         = soma dos % dos itens até ele
```

- **Classe A**: itens até 80% do valor acumulado
- **Classe B**: de 80% a 95%
- **Classe C**: de 95% a 100%

O item que cruza a linha dos 80% ainda entra na classe A, porque a comparação usa o acumulado de antes dele.

### API

As rotas, os perfis e os códigos de resposta estão em [docs/api.md](docs/api.md). O banco (schema, trigger e views) está em [db/README.md](db/README.md).

O cookie da sessão é `httpOnly`. O navegador envia sozinho; o JavaScript da página não lê o token. Páginas sem sessão vão para `/login`. As rotas `/api` respondem JSON (`401` ou `403`), para o `fetch` não receber HTML.
