-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "perfil_usuario" AS ENUM ('admin', 'operador');

-- CreateEnum
CREATE TYPE "tipo_movimentacao" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "status_sugestao" AS ENUM ('pendente', 'aceita', 'ignorada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(72) NOT NULL,
    "perfil" "perfil_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "cor" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(160) NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "quantidade_atual" INTEGER NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL,
    "valor_custo" DECIMAL(10,2) NOT NULL,
    "valor_venda" DECIMAL(10,2) NOT NULL,
    "qr_code" VARCHAR(64) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "tipo_movimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "observacao" VARCHAR(240),
    "data_hora" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugestoes_reposicao" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "consumo_medio_diario" DECIMAL(10,4) NOT NULL,
    "ponto_reposicao_sugerido" INTEGER NOT NULL,
    "quantidade_sugerida" INTEGER NOT NULL,
    "data_geracao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "status_sugestao" NOT NULL DEFAULT 'pendente',
    "metodo" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sugestoes_reposicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_qr_code_key" ON "produtos"("qr_code");

-- CreateIndex
CREATE INDEX "produtos_categoria_id_idx" ON "produtos"("categoria_id");

-- CreateIndex
CREATE INDEX "movimentacoes_produto_id_data_hora_idx" ON "movimentacoes"("produto_id", "data_hora");

-- CreateIndex
CREATE INDEX "movimentacoes_data_hora_idx" ON "movimentacoes"("data_hora");

-- CreateIndex
CREATE INDEX "movimentacoes_tipo_idx" ON "movimentacoes"("tipo");

-- CreateIndex
CREATE INDEX "sugestoes_reposicao_produto_id_data_geracao_idx" ON "sugestoes_reposicao"("produto_id", "data_geracao");

-- CreateIndex
CREATE INDEX "sugestoes_reposicao_status_idx" ON "sugestoes_reposicao"("status");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestoes_reposicao" ADD CONSTRAINT "sugestoes_reposicao_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Quantidades e preços não podem ficar negativos. Saída de zero não é movimentação.
ALTER TABLE "produtos"
  ADD CONSTRAINT "produtos_quantidade_atual_nao_negativa" CHECK ("quantidade_atual" >= 0),
  ADD CONSTRAINT "produtos_estoque_minimo_nao_negativo" CHECK ("estoque_minimo" >= 0),
  ADD CONSTRAINT "produtos_valor_custo_nao_negativo" CHECK ("valor_custo" >= 0),
  ADD CONSTRAINT "produtos_valor_venda_nao_negativo" CHECK ("valor_venda" >= 0);

ALTER TABLE "movimentacoes"
  ADD CONSTRAINT "movimentacoes_quantidade_positiva" CHECK ("quantidade" > 0);

-- updated_at também muda em SQL cru, não só pelo Prisma.
CREATE OR REPLACE FUNCTION "fn_atualizar_updated_at"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "tg_usuarios_updated_at"
BEFORE UPDATE ON "usuarios"
FOR EACH ROW
EXECUTE FUNCTION "fn_atualizar_updated_at"();

CREATE TRIGGER "tg_categorias_updated_at"
BEFORE UPDATE ON "categorias"
FOR EACH ROW
EXECUTE FUNCTION "fn_atualizar_updated_at"();

CREATE TRIGGER "tg_produtos_updated_at"
BEFORE UPDATE ON "produtos"
FOR EACH ROW
EXECUTE FUNCTION "fn_atualizar_updated_at"();

CREATE TRIGGER "tg_sugestoes_reposicao_updated_at"
BEFORE UPDATE ON "sugestoes_reposicao"
FOR EACH ROW
EXECUTE FUNCTION "fn_atualizar_updated_at"();

-- Entrada soma e saída subtrai na mesma transação. Saída maior que o saldo é recusada.
CREATE OR REPLACE FUNCTION "fn_atualizar_estoque"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  saldo INTEGER;
  nome_produto TEXT;
BEGIN
  SELECT "quantidade_atual", "descricao"
    INTO saldo, nome_produto
  FROM "produtos"
  WHERE "id" = NEW.produto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não encontrado para a movimentação.', NEW.produto_id;
  END IF;

  IF NEW.tipo = 'entrada'::"tipo_movimentacao" THEN
    UPDATE "produtos"
      SET "quantidade_atual" = "quantidade_atual" + NEW.quantidade
      WHERE "id" = NEW.produto_id;
  ELSIF NEW.tipo = 'saida'::"tipo_movimentacao" THEN
    IF saldo < NEW.quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente: % tem só % unidade(s) e a saída pedida é de %.', nome_produto, saldo, NEW.quantidade;
    END IF;

    UPDATE "produtos"
      SET "quantidade_atual" = "quantidade_atual" - NEW.quantidade
      WHERE "id" = NEW.produto_id;
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido: %.', NEW.tipo;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tg_movimentacao_atualiza_estoque"
AFTER INSERT ON "movimentacoes"
FOR EACH ROW
EXECUTE FUNCTION "fn_atualizar_estoque"();

-- O histórico alimenta relatório e IA: não pode ser corrigido nem apagado.
CREATE OR REPLACE FUNCTION "fn_bloquear_alteracao_movimentacao"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Histórico imutável: movimentações não podem ser alteradas nem apagadas.';
END;
$$;

CREATE TRIGGER "tg_movimentacao_imutavel"
BEFORE UPDATE OR DELETE ON "movimentacoes"
FOR EACH ROW
EXECUTE FUNCTION "fn_bloquear_alteracao_movimentacao"();

-- Alerta de estoque mínimo. Só produto ativo.
CREATE VIEW "vw_produtos_estoque_baixo" AS
SELECT
  p."id",
  p."codigo",
  p."descricao",
  c."nome" AS "categoria",
  c."cor",
  p."quantidade_atual",
  p."estoque_minimo",
  p."valor_custo",
  p."valor_venda",
  p."qr_code"
FROM "produtos" p
JOIN "categorias" c ON c."id" = p."categoria_id"
WHERE p."ativo" AND p."quantidade_atual" <= p."estoque_minimo";

-- Uma linha com o valor do estoque a preço de custo e a preço de venda.
CREATE VIEW "vw_valor_total_estoque" AS
SELECT
  COALESCE(SUM("quantidade_atual" * "valor_custo"), 0) AS "valor_custo_total",
  COALESCE(SUM("quantidade_atual" * "valor_venda"), 0) AS "valor_venda_total",
  COUNT(*)::int AS "produtos_ativos"
FROM "produtos"
WHERE "ativo";

-- Grão diário. A coluna mes permite somar o mês sem outra view.
CREATE VIEW "vw_movimentacoes_por_periodo" AS
SELECT
  (date_trunc('day', "data_hora" AT TIME ZONE 'America/Sao_Paulo'))::date AS "dia",
  (date_trunc('month', "data_hora" AT TIME ZONE 'America/Sao_Paulo'))::date AS "mes",
  "tipo"::text AS "tipo",
  COUNT(*)::int AS "total_movimentacoes",
  SUM("quantidade")::int AS "quantidade_total",
  SUM("quantidade" * "valor_unitario") AS "valor_total"
FROM "movimentacoes"
GROUP BY 1, 2, 3;

CREATE VIEW "vw_movimentacoes_por_produto" AS
SELECT
  p."id" AS "produto_id",
  p."codigo",
  p."descricao",
  c."nome" AS "categoria",
  m."tipo"::text AS "tipo",
  COUNT(*)::int AS "total_movimentacoes",
  SUM(m."quantidade")::int AS "quantidade_total",
  SUM(m."quantidade" * m."valor_unitario") AS "valor_total"
FROM "movimentacoes" m
JOIN "produtos" p ON p."id" = m."produto_id"
JOIN "categorias" c ON c."id" = p."categoria_id"
GROUP BY p."id", p."codigo", p."descricao", c."nome", m."tipo";

CREATE VIEW "vw_movimentacoes_por_categoria" AS
SELECT
  c."id" AS "categoria_id",
  c."nome" AS "categoria",
  m."tipo"::text AS "tipo",
  COUNT(*)::int AS "total_movimentacoes",
  SUM(m."quantidade")::int AS "quantidade_total",
  SUM(m."quantidade" * m."valor_unitario") AS "valor_total"
FROM "movimentacoes" m
JOIN "produtos" p ON p."id" = m."produto_id"
JOIN "categorias" c ON c."id" = p."categoria_id"
GROUP BY c."id", c."nome", m."tipo";

-- Ranking pela quantidade que saiu. Produto sem saída aparece com zero.
CREATE VIEW "vw_produtos_mais_movimentados" AS
SELECT
  p."id" AS "produto_id",
  p."codigo",
  p."descricao",
  c."nome" AS "categoria",
  COALESCE(SUM(m."quantidade"), 0)::int AS "quantidade_saida",
  COUNT(m."id")::int AS "total_saidas"
FROM "produtos" p
JOIN "categorias" c ON c."id" = p."categoria_id"
LEFT JOIN "movimentacoes" m ON m."produto_id" = p."id" AND m."tipo" = 'saida'::"tipo_movimentacao"
WHERE p."ativo"
GROUP BY p."id", p."codigo", p."descricao", c."nome";

-- Média de saídas por dia nas três janelas que a IA pode consultar.
CREATE VIEW "vw_consumo_medio_diario" AS
SELECT
  p."id" AS "produto_id",
  p."codigo",
  p."descricao",
  COALESCE(SUM(m."quantidade") FILTER (
    WHERE m."tipo" = 'saida'::"tipo_movimentacao" AND m."data_hora" >= NOW() - INTERVAL '30 days'
  ), 0) / 30.0 AS "consumo_medio_30",
  COALESCE(SUM(m."quantidade") FILTER (
    WHERE m."tipo" = 'saida'::"tipo_movimentacao" AND m."data_hora" >= NOW() - INTERVAL '60 days'
  ), 0) / 60.0 AS "consumo_medio_60",
  COALESCE(SUM(m."quantidade") FILTER (
    WHERE m."tipo" = 'saida'::"tipo_movimentacao" AND m."data_hora" >= NOW() - INTERVAL '90 days'
  ), 0) / 90.0 AS "consumo_medio_90"
FROM "produtos" p
LEFT JOIN "movimentacoes" m ON m."produto_id" = p."id"
WHERE p."ativo"
GROUP BY p."id", p."codigo", p."descricao";
