import { exigirSessao } from '../../../lib/auth'
import { erroInterno, json } from '../../../lib/http'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const categorias = await prisma.categoria.findMany({ orderBy: { nome: 'asc' } })
    return json(categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome, cor: categoria.cor })))
  } catch (erro) {
    return erroInterno(erro, 'GET /api/categorias')
  }
}
