-- Série diária de saídas, com zero nos dias sem movimento, para desvio e sazonalidade.
CREATE VIEW "vw_consumo_diario_historico" AS
WITH dias AS (
  SELECT generate_series(
    ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 89),
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date,
    INTERVAL '1 day'
  )::date AS dia
),
saidas AS (
  SELECT
    m."produto_id",
    (m."data_hora" AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    SUM(m."quantidade")::int AS quantidade
  FROM "movimentacoes" m
  WHERE m."tipo" = 'saida'::"tipo_movimentacao"
    AND (m."data_hora" AT TIME ZONE 'America/Sao_Paulo')::date
        >= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 89)
  GROUP BY m."produto_id", (m."data_hora" AT TIME ZONE 'America/Sao_Paulo')::date
)
SELECT
  p."id" AS "produto_id",
  p."codigo",
  d.dia,
  COALESCE(s.quantidade, 0)::int AS "quantidade_saida"
FROM "produtos" p
CROSS JOIN dias d
LEFT JOIN saidas s ON s."produto_id" = p."id" AND s.dia = d.dia
WHERE p."ativo";

-- No máximo uma sugestão pendente por produto. Aceitas e ignoradas continuam no histórico.
CREATE UNIQUE INDEX "sugestoes_reposicao_pendente_produto_idx"
ON "sugestoes_reposicao" ("produto_id")
WHERE "status" = 'pendente'::"status_sugestao";
