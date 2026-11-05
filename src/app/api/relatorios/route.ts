import type { NextRequest } from 'next/server'
import { exigirSessao } from '../../../lib/auth'
import { erroInterno, errosZod, json } from '../../../lib/http'
import {
  listarConsumoMedioDiario,
  listarMovimentacoesPorCategoria,
  listarMovimentacoesPorPeriodo,
  listarMovimentacoesPorProduto,
  listarProdutosMaisMovimentados,
  obterValorTotalEstoque,
} from '../../../lib/queries'
import { filtroRelatorioSchema } from '../../../lib/validacao'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const filtros = filtroRelatorioSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!filtros.success) return errosZod(filtros)

    const { de, ate } = filtros.data
    const [porPeriodo, porProduto, porCategoria, maisMovimentados, consumoMedio, valorEstoque] = await Promise.all([
      listarMovimentacoesPorPeriodo(),
      listarMovimentacoesPorProduto(),
      listarMovimentacoesPorCategoria(),
      listarProdutosMaisMovimentados(),
      listarConsumoMedioDiario(),
      obterValorTotalEstoque(),
    ])

    const periodo = porPeriodo.filter((linha) => {
      if (de && linha.dia < de) return false
      if (ate && linha.dia > ate) return false
      return true
    })

    return json({ de: de ?? null, ate: ate ?? null, porPeriodo: periodo, porProduto, porCategoria, maisMovimentados, consumoMedio, valorEstoque })
  } catch (erro) {
    return erroInterno(erro, 'GET /api/relatorios')
  }
}
