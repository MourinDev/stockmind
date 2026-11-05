import { exigirSessao } from '../../../../lib/auth'
import { erroInterno, errosZod, json } from '../../../../lib/http'
import { incluirProduto, ordenarSugestoes, sugestaoApi } from '../../../../lib/ia/apresentar'
import { prisma } from '../../../../lib/prisma'
import { filtroSugestoesSchema } from '../../../../lib/validacao'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const acesso = await exigirSessao(['admin', 'operador'])
    if (acesso.resposta) return acesso.resposta

    const filtros = filtroSugestoesSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!filtros.success) return errosZod(filtros)

    const sugestoes = await prisma.sugestaoReposicao.findMany({
      where: filtros.data.status ? { status: filtros.data.status } : {},
      include: incluirProduto,
    })

    return json(ordenarSugestoes(sugestoes.map(sugestaoApi)))
  } catch (erro) {
    return erroInterno(erro, 'GET /api/ia/sugestoes')
  }
}
