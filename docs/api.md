# API do StockMind

Route Handlers do Next.js 16, em `route.ts`. Todas rodam no runtime Node.js. O cliente Prisma é o singleton de `src/lib/prisma.ts`. A checagem de tipos é `npm run typecheck`.

Erro padrão: `{ "erro": "mensagem" }`. Validação com zod acrescenta `campos`, um objeto com a mensagem de cada campo inválido, e responde `400`.

`Decimal` e `BigInt` viram número antes do JSON. Nenhuma resposta inclui `senha_hash`. O perfil, o preço e o usuário da movimentação não são aceitos do cliente: o perfil sai do token conferido no banco, o preço sai do produto e o `usuarioId` sai da sessão.

## Autenticação

`POST /api/auth/login` recebe `{ email, senha }`. A busca é pelo e-mail, o usuário precisa estar ativo e a senha é conferida com `bcryptjs.compare`. E-mail inexistente, usuário inativo e senha errada devolvem a mesma mensagem: `E-mail ou senha inválidos`.

No sucesso, a resposta traz `{ usuario: { id, nome, email, perfil } }` e grava o cookie `stockmind_sessao`.

O cookie é um JWT HS256 (`jose`), com expiração de 8 horas. O payload tem só `id` (no `sub`), `perfil` e `nome`. Flags: `httpOnly`, `sameSite=lax`, `path=/`, `secure` em produção. O segredo é `SESSION_SECRET` (nunca `NEXT_PUBLIC_`). Gere com `openssl rand -base64 32`.

`GET /api/auth/me` relê o usuário no banco. Se o token não existir, estiver vencido ou o usuário estiver inativo, responde `401`.

`POST /api/auth/logout` apaga o cookie. Não exige sessão, para o navegador conseguir limpar um token vencido.

`src/proxy.ts` (o interceptador de requisições do Next.js 16; não é `middleware.js`) só olha o JWT, sem consultar o banco:

- página sem sessão, fora de `/login`, redireciona para `/login`;
- `/login` com sessão válida redireciona para `/`;
- `/api` não é redirecionada. O `fetch` receberia a página de login. Cada rota protegida chama `exigirSessao` e responde `401` (sem sessão) ou `403` (perfil sem permissão).

Recarregar a página mantém o cookie. A casca espera o `GET /api/auth/me` antes de decidir o redirecionamento no cliente.

## Endpoints

| Método | Caminho | Perfil | Descrição | Respostas |
| --- | --- | --- | --- | --- |
| POST | /api/auth/login | público | Autentica e grava o cookie | 200, 400, 401, 500 |
| POST | /api/auth/logout | público | Apaga o cookie | 200 |
| GET | /api/auth/me | sessão | Usuário atual, sem senha | 200, 401, 500 |
| GET | /api/categorias | sessão | Lista id, nome e cor | 200, 401, 500 |
| GET | /api/produtos | sessão | Produtos ativos, com o nome da categoria. Query opcional: `busca` (código ou descrição), `categoria`, `estoqueBaixo=1` | 200, 400, 401, 500 |
| GET | /api/produtos/{id} | sessão | Um produto ativo | 200, 400, 401, 404, 500 |
| GET | /api/produtos/codigo/{codigo} | sessão | Busca pelo código do QR Code, em maiúsculas | 200, 400, 401, 404, 500 |
| POST | /api/produtos | admin | Cadastra. `quantidadeAtual` não é aceita: o saldo nasce 0 e só muda por movimentação. `codigo` e `qr_code` recebem o mesmo código | 201, 400, 401, 403, 409, 500 |
| PATCH | /api/produtos/{id} | admin | Atualiza cadastro. Não altera `quantidadeAtual`. Se `valorCusto` não vier, o custo atual permanece | 200, 400, 401, 403, 404, 409, 500 |
| DELETE | /api/produtos/{id} | admin | Soft delete: `ativo = false`. A linha não é apagada | 200, 400, 401, 403, 404, 500 |
| GET | /api/movimentacoes | sessão | Histórico paginado. Query: `produtoId`, `tipo` (`entrada` ou `saida`), `de`, `ate` (`AAAA-MM-DD`, fuso America/Sao_Paulo), `pagina`, `porPagina` (máximo 100). Corpo: `{ itens, total, pagina, porPagina }` | 200, 400, 401, 500 |
| POST | /api/movimentacoes | admin e operador | Insere a movimentação. Corpo: `produtoId`, `tipo`, `quantidade`, `observacao` opcional. O preço unitário é o custo na entrada e a venda na saída, lidos no servidor. O trigger atualiza o saldo. A resposta traz a movimentação e o produto já com o saldo novo | 201, 400, 401, 403, 404, 422, 500 |
| GET | /api/dashboard | sessão | Estoque baixo, valor do estoque, movimentação por período, mais movimentados e consumo médio. Dados de `src/lib/queries.ts` | 200, 401, 500 |
| GET | /api/relatorios | sessão | As mesmas views, mais o agrupamento por produto e por categoria. `de` e `ate` filtram só a série por período | 200, 400, 401, 500 |
| POST | /api/ia/gerar | admin | Recalcula as sugestões de reposição e grava em `sugestoes_reposicao`. Devolve o resumo: analisados, criadas, atualizadas, removidas, puladasSemConsumo, puladasSemNecessidade | 200, 401, 403, 500 |
| GET | /api/ia/sugestoes | admin e operador | Lista as sugestões com o produto. Query opcional `status` (`pendente`, `aceita`, `ignorada`). Pendentes primeiro; dentro do grupo, menor cobertura em dias primeiro | 200, 400, 401, 403, 500 |
| PATCH | /api/ia/sugestoes/{id} | admin | Corpo `{ status: "aceita" ou "ignorada" }`. Só a partir de `pendente`; outro estado responde 409. Não cria movimentação | 200, 400, 401, 403, 404, 409, 500 |

Não há `PATCH` nem `DELETE` de movimentação. O banco bloqueia os dois.

## Saldo insuficiente

O trigger `fn_atualizar_estoque` recusa a saída com:

```text
Saldo insuficiente: {descricao} tem só {saldo} unidade(s) e a saída pedida é de {quantidade}.
```

A frase contém "Saldo insuficiente", o saldo disponível e a quantidade pedida. A API extrai os dois números e responde `422`:

```json
{ "erro": "Saldo insuficiente: disponível 8, solicitado 20" }
```

Produto com `ativo = false` também é recusado nesse POST, com `422` e a mensagem "Produto inativo. Não é possível registrar movimentação." Produto inexistente é `404`.

## O que a tela faz com o saldo

O formulário de produto tem um único preço. No cadastro, custo e venda recebem esse mesmo valor. Na edição, só a venda é atualizada; o custo gravado no banco permanece, para não apagar a margem dos itens do seed.

A quantidade do formulário não vai no `POST` nem no `PATCH`. Se a quantidade inicial for maior que zero, o provider grava uma entrada. Se a quantidade editada mudar, a diferença vira entrada ou saída com a observação "Ajuste de inventário".

Aceitar uma sugestão de reposição não cria movimentação. A entrada do produto continua em `POST /api/movimentacoes`. O método da sugestão está em `docs/ia.md`.

O dashboard ainda classifica urgência no navegador com a média simples de 15 dias (`calcularSugestaoIA`). Relatórios usam a Curva ABC no cliente. Os endpoints de dashboard e relatórios existem para consulta e para o TCC.

## Limitação conhecida

No cadastro de produto, custo e venda recebem o mesmo valor, porque o formulário tem um único campo de preço.
