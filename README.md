# StockMind: front-end

Sistema inteligente de controle de estoque para pequenos comércios.
Projeto Integrado de Engenharia de Produto (ENSOF8AN1), Uniceplac 2026.

## Como rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão final em dist/
```

Logins de demonstração (também há botões de preenchimento rápido na tela de login):

| Perfil   | E-mail                 | Senha  |
|----------|------------------------|--------|
| Gestor   | gestor@stockmind.com   | 123456 |
| Operador | operador@stockmind.com | 123456 |

Stack: React 18 + Vite, Tailwind CSS, Recharts (gráficos), lucide-react (ícones) e qrcode-generator (QR Codes das etiquetas).

## Arquitetura e explicação para a banca

### Organização das pastas

```
src/
├── App.jsx                 estado global e camada de dados (as ações que alteram o estoque)
├── dados.js                constantes, cores, parâmetros da IA e dados iniciais (mock)
├── regras.js               regras de negócio puras: Curva ABC, IA, validações, CSV
├── componentes/
│   ├── ui.jsx              peças visuais reutilizáveis (cartão, botão, campo, modal, selos...)
│   ├── Layout.jsx          menu lateral, cabeçalho e central de alertas
│   └── QRCode.jsx          geração do QR Code e da etiqueta de prateleira
└── telas/
    ├── Login.jsx           TELA 0: autenticação
    ├── Dashboard.jsx       TELA 1: indicadores, gráficos e alertas
    ├── Produtos.jsx        TELA 2: cadastro com validações
    ├── Movimentacoes.jsx   TELA 3: entradas e saídas
    ├── OperacaoQR.jsx      TELA 4: leitor de QR Code e etiquetas
    ├── InteligenciaIA.jsx  TELA 5: sugestão de reposição e projeção de ruptura
    └── Relatorios.jsx      TELA 6: Curva ABC (Pareto) e histórico com CSV
```

- **`dados.js`**: 10 produtos e 15 movimentações dos últimos 15 dias. Três produtos já começam em estoque crítico.
- **`regras.js`**: funções puras (`calcularCurvaABC`, `calcularSugestaoIA`, `projetarEstoque`, `validarProduto`, `baixarCSV`). Não mexem em estado, então podem ir para o Node.js quase sem mudança.
- **`App.jsx`**: é o único lugar que altera dados. As telas só recebem dados e chamam as ações.

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

O `App` é o dono de três estados principais, que espelham as tabelas do PostgreSQL:

- `usuarioLogado`: `{ id, nome, email, cargo, token }`. Enquanto for `null`, só a tela de login aparece (requisito de segurança).
- `produtos`: `{ id, codigo, descricao, categoria, quantidade, estoqueMinimo, valorUnitario }`
- `movimentacoes`: `{ id, produtoId, tipo, quantidade, dataOcorrencia, observacao, usuarioResponsavel }`

As telas recebem esses dados por props e nunca alteram o estado direto. Elas chamam as ações do `App`:

| Ação                    | O que faz                                                        |
|-------------------------|------------------------------------------------------------------|
| `fazerLogin` / `sair`   | Autentica e encerra a sessão                                     |
| `salvarProduto`         | Valida e cadastra ou edita um produto                            |
| `excluirProduto`        | Exclui, desde que o produto não tenha movimentações              |
| `registrarMovimentacao` | Grava a movimentação e atualiza o saldo do produto               |

Como tudo parte do mesmo estado, um registro feito pelo leitor de QR Code ou pela IA aparece na hora no Dashboard, nos alertas, na Curva ABC e no histórico.

**Regra crítica do estoque:** `ENTRADA` soma ao saldo. `SAIDA` subtrai, e a operação é bloqueada com mensagem de erro se a quantidade pedida for maior que o saldo disponível. O saldo nunca fica negativo.

**Validações do cadastro:** campos obrigatórios, código duplicado (sem diferenciar maiúsculas), quantidade e estoque mínimo negativos ou fracionados, e valor unitário menor ou igual a zero. Cada erro aparece em vermelho embaixo do campo.

### Fórmula da StockMind IA

Parâmetros: janela de análise de 15 dias, prazo de entrega de 3 dias e cobertura de 15 ou 30 dias (escolhida na tela).

```
giro diário        = soma das SAÍDAS do produto nos últimos 15 dias / 15
autonomia (dias)   = quantidade atual / giro diário
ponto de reposição = giro diário x 3 (prazo de entrega) + estoque mínimo
sugestão de compra = arredondar para cima(giro diário x cobertura + estoque mínimo - quantidade atual), nunca menor que 0
```

Classificação de urgência:

- **Reposição Imediata**: quantidade <= estoque mínimo, ou autonomia <= 3 dias (acaba antes da entrega chegar).
- **Planejar Compra**: quantidade <= ponto de reposição, ou autonomia <= 10 dias.
- **Estoque Saudável**: nenhum dos casos acima.

Exemplo com os dados iniciais, para o Leite Integral (42 saídas em 15 dias, saldo 6, mínimo 24, cobertura de 15 dias):
giro = 42 / 15 = 2,8 por dia; autonomia = 6 / 2,8 = 2,1 dias; sugestão = 2,8 x 15 + 24 - 6 = 60 unidades. Resultado: **Reposição Imediata**.

O botão **Gerar ordem de reposição** junta os itens urgentes, mostra o custo estimado e, ao confirmar o recebimento, registra uma ENTRADA para cada um.

É um modelo estatístico simples (média móvel), escolhido por ser explicável. Numa próxima versão ele pode dar lugar a modelos de previsão mais robustos, como as redes neurais recorrentes citadas no referencial (Soares Junior, 2020), sem mudar a tela, porque a tela só consome o resultado de `calcularSugestaoIA`.

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

### Como trocar os dados locais pelo back-end (Node.js + PostgreSQL)

Toda a manipulação de dados fica num único bloco do `App.jsx` ("CAMADA DE DADOS"). Cada função vira uma chamada à API:

| Função hoje                     | Rota no back-end             |
|---------------------------------|------------------------------|
| dados iniciais de produtos      | `GET /api/produtos`          |
| dados iniciais de movimentações | `GET /api/movimentacoes`     |
| `fazerLogin`                    | `POST /api/auth/login`       |
| `salvarProduto` (novo)          | `POST /api/produtos`         |
| `salvarProduto` (edição)        | `PUT /api/produtos/:id`      |
| `excluirProduto`                | `DELETE /api/produtos/:id`   |
| `registrarMovimentacoes`        | `POST /api/movimentacoes`    |

Exemplo de como fica `registrarMovimentacao`:

```js
async function registrarMovimentacao(dados) {
  const resposta = await fetch('/api/movimentacoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${usuarioLogado.token}`,
    },
    body: JSON.stringify(dados),
  })
  const corpo = await resposta.json()
  if (!resposta.ok) return { ok: false, erro: corpo.erro }

  // o back-end devolve a movimentação criada e o produto com saldo novo
  setMovimentacoes((lista) => [...lista, corpo.movimentacao])
  setProdutos((lista) => lista.map((p) => (p.id === corpo.produto.id ? corpo.produto : p)))
  return { ok: true }
}
```

E a carga inicial:

```js
useEffect(() => {
  if (!usuarioLogado) return
  const cabecalho = { headers: { Authorization: `Bearer ${usuarioLogado.token}` } }
  fetch('/api/produtos', cabecalho).then((r) => r.json()).then(setProdutos)
  fetch('/api/movimentacoes', cabecalho).then((r) => r.json()).then(setMovimentacoes)
}, [usuarioLogado])
```

Como as funções já devolvem `{ ok, erro }`, as telas não mudam. Também vale lembrar:

- O back-end repete todas as validações (código duplicado, saldo insuficiente etc.). Validar só no front não é seguro.
- A movimentação e a atualização do saldo devem rodar numa **transação** do PostgreSQL, para nunca gravar uma sem a outra.
- `calcularCurvaABC` e `calcularSugestaoIA` podem virar rotas (`GET /api/relatorios/curva-abc`, `GET /api/ia/sugestoes`) quando o volume de dados crescer.
- A senha fica só no banco, com hash (bcrypt), e o login devolve um token JWT.
