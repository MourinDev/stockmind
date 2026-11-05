import { exigirSessao } from '../../../../../lib/auth'
import { erroInterno, json, jsonErro, produtoApi } from '../../../../../lib/http'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

export async function GET(_request, { params }) {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const { codigo } = await params
    const normalizado = decodeURIComponent(codigo).trim().toUpperCase()
    if (!normalizado || normalizado.length > 20) return jsonErro(400, 'Código inválido.')

    const produto = await prisma.produto.findFirst({
      where: { codigo: normalizado, ativo: true },
      include: { categoria: true },
    })
    if (!produto) return jsonErro(404, 'Produto não encontrado.')
    return json(produtoApi(produto))
  } catch (erro) {
    return erroInterno(erro, 'GET /api/produtos/codigo/[codigo]')
  }
}
