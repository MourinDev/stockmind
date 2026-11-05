import 'server-only'
import { prisma } from './prisma'

function numero(valor: unknown) {
  if (valor == null) return 0
  if (typeof valor === 'number') return valor
  if (typeof valor === 'bigint') return Number(valor)
  if (typeof valor === 'object' && 'toNumber' in valor && typeof valor.toNumber === 'function') return Number(valor.toNumber())
  return Number(valor)
}

function dataISO(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor)
  const ano = data.getUTCFullYear()
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(data.getUTCDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export async function listarProdutosEstoqueBaixo() {
  const linhas = await prisma.$queryRaw<Array<{
    id: number
    codigo: string
    descricao: string
    categoria: string
    cor: string
    quantidade_atual: number
    estoque_minimo: number
    valor_custo: unknown
    valor_venda: unknown
    qr_code: string
  }>>`
    SELECT id, codigo, descricao, categoria, cor, quantidade_atual, estoque_minimo, valor_custo, valor_venda, qr_code
    FROM vw_produtos_estoque_baixo
    ORDER BY quantidade_atual, descricao
  `

  return linhas.map((linha) => ({
    id: linha.id,
    codigo: linha.codigo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    cor: linha.cor,
    quantidadeAtual: linha.quantidade_atual,
    estoqueMinimo: linha.estoque_minimo,
    valorCusto: numero(linha.valor_custo),
    valorVenda: numero(linha.valor_venda),
    qrCode: linha.qr_code,
  }))
}

export async function obterValorTotalEstoque() {
  const linhas = await prisma.$queryRaw<Array<{
    valor_custo_total: unknown
    valor_venda_total: unknown
    produtos_ativos: number
  }>>`
    SELECT valor_custo_total, valor_venda_total, produtos_ativos
    FROM vw_valor_total_estoque
  `
  const linha = linhas[0]
  if (!linha) return { valorCustoTotal: 0, valorVendaTotal: 0, produtosAtivos: 0 }

  return {
    valorCustoTotal: numero(linha.valor_custo_total),
    valorVendaTotal: numero(linha.valor_venda_total),
    produtosAtivos: linha.produtos_ativos,
  }
}

function mapearPeriodo(linha: {
  dia: Date | string
  mes: Date | string
  tipo: string
  total_movimentacoes: number
  quantidade_total: number
  valor_total: unknown
}) {
  return {
    dia: dataISO(linha.dia),
    mes: dataISO(linha.mes),
    tipo: linha.tipo,
    totalMovimentacoes: linha.total_movimentacoes,
    quantidadeTotal: linha.quantidade_total,
    valorTotal: numero(linha.valor_total),
  }
}

export async function listarMovimentacoesPorPeriodo() {
  const linhas = await prisma.$queryRaw<Parameters<typeof mapearPeriodo>[0][]>`
    SELECT dia, mes, tipo, total_movimentacoes, quantidade_total, valor_total
    FROM vw_movimentacoes_por_periodo
    ORDER BY dia, tipo
  `
  return linhas.map(mapearPeriodo)
}

function mapearGrupo(linha: {
  tipo: string
  total_movimentacoes: number
  quantidade_total: number
  valor_total: unknown
}) {
  return {
    tipo: linha.tipo,
    totalMovimentacoes: linha.total_movimentacoes,
    quantidadeTotal: linha.quantidade_total,
    valorTotal: numero(linha.valor_total),
  }
}

export async function listarMovimentacoesPorProduto() {
  const linhas = await prisma.$queryRaw<Array<{
    produto_id: number
    codigo: string
    descricao: string
    categoria: string
    tipo: string
    total_movimentacoes: number
    quantidade_total: number
    valor_total: unknown
  }>>`
    SELECT produto_id, codigo, descricao, categoria, tipo, total_movimentacoes, quantidade_total, valor_total
    FROM vw_movimentacoes_por_produto
    ORDER BY descricao, tipo
  `

  return linhas.map((linha) => ({
    produtoId: linha.produto_id,
    codigo: linha.codigo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    ...mapearGrupo(linha),
  }))
}

export async function listarMovimentacoesPorCategoria() {
  const linhas = await prisma.$queryRaw<Array<{
    categoria_id: number
    categoria: string
    tipo: string
    total_movimentacoes: number
    quantidade_total: number
    valor_total: unknown
  }>>`
    SELECT categoria_id, categoria, tipo, total_movimentacoes, quantidade_total, valor_total
    FROM vw_movimentacoes_por_categoria
    ORDER BY categoria, tipo
  `

  return linhas.map((linha) => ({
    categoriaId: linha.categoria_id,
    categoria: linha.categoria,
    ...mapearGrupo(linha),
  }))
}

export async function listarProdutosMaisMovimentados() {
  const linhas = await prisma.$queryRaw<Array<{
    produto_id: number
    codigo: string
    descricao: string
    categoria: string
    quantidade_saida: number
    total_saidas: number
  }>>`
    SELECT produto_id, codigo, descricao, categoria, quantidade_saida, total_saidas
    FROM vw_produtos_mais_movimentados
    ORDER BY quantidade_saida DESC, descricao
  `

  return linhas.map((linha) => ({
    produtoId: linha.produto_id,
    codigo: linha.codigo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    quantidadeSaida: linha.quantidade_saida,
    totalSaidas: linha.total_saidas,
  }))
}

export async function listarConsumoMedioDiario() {
  const linhas = await prisma.$queryRaw<Array<{
    produto_id: number
    codigo: string
    descricao: string
    consumo_medio_30: unknown
    consumo_medio_60: unknown
    consumo_medio_90: unknown
  }>>`
    SELECT produto_id, codigo, descricao, consumo_medio_30, consumo_medio_60, consumo_medio_90
    FROM vw_consumo_medio_diario
    ORDER BY consumo_medio_30 DESC, descricao
  `

  return linhas.map((linha) => ({
    produtoId: linha.produto_id,
    codigo: linha.codigo,
    descricao: linha.descricao,
    consumoMedio30: numero(linha.consumo_medio_30),
    consumoMedio60: numero(linha.consumo_medio_60),
    consumoMedio90: numero(linha.consumo_medio_90),
  }))
}

export async function listarConsumoDiarioHistorico() {
  const linhas = await prisma.$queryRaw<Array<{
    produto_id: number
    codigo: string
    dia: Date | string
    quantidade_saida: unknown
  }>>`
    SELECT produto_id, codigo, dia, quantidade_saida
    FROM vw_consumo_diario_historico
    ORDER BY produto_id, dia
  `

  return linhas.map((linha) => ({
    produtoId: linha.produto_id,
    codigo: linha.codigo,
    dia: dataISO(linha.dia),
    quantidadeSaida: numero(linha.quantidade_saida),
  }))
}
