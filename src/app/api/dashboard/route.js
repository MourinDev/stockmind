import { exigirSessao } from '../../../lib/auth'
import { erroInterno, json } from '../../../lib/http'
import {
  listarConsumoMedioDiario,
  listarMovimentacoesPorPeriodo,
  listarProdutosEstoqueBaixo,
  listarProdutosMaisMovimentados,
  obterValorTotalEstoque,
} from '../../../lib/queries'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const [estoqueBaixo, valorEstoque, porPeriodo, maisMovimentados, consumoMedio] = await Promise.all([
      listarProdutosEstoqueBaixo(),
      obterValorTotalEstoque(),
      listarMovimentacoesPorPeriodo(),
      listarProdutosMaisMovimentados(),
      listarConsumoMedioDiario(),
    ])

    return json({ estoqueBaixo, valorEstoque, porPeriodo, maisMovimentados, consumoMedio })
  } catch (erro) {
    return erroInterno(erro, 'GET /api/dashboard')
  }
}
