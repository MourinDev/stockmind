import type { NextRequest } from 'next/server'
import { exigirSessao } from '../../../../../lib/auth'
import { erroInterno, errosZod, json, jsonErro, lerJson } from '../../../../../lib/http'
import { incluirProduto, sugestaoApi } from '../../../../../lib/ia/apresentar'
import { prisma } from '../../../../../lib/prisma'
import { decisaoSugestaoSchema } from '../../../../../lib/validacao'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acesso = await exigirSessao(['admin'])
    if (acesso.resposta) return acesso.resposta

    const { id } = await params
    const sugestaoId = Number(id)
    if (!Number.isInteger(sugestaoId) || sugestaoId <= 0) return jsonErro(400, 'Identificador inválido.')

    const validado = decisaoSugestaoSchema.safeParse(await lerJson(request))
    if (!validado.success) return errosZod(validado)

    const atual = await prisma.sugestaoReposicao.findUnique({ where: { id: sugestaoId } })
    if (!atual) return jsonErro(404, 'Sugestão não encontrada.')
    if (atual.status !== 'pendente') return jsonErro(409, 'Só uma sugestão pendente pode ser aceita ou ignorada.')

    const atualizada = await prisma.sugestaoReposicao.update({
      where: { id: sugestaoId },
      data: { status: validado.data.status },
      include: incluirProduto,
    })
    return json(sugestaoApi(atualizada))
  } catch (erro) {
    return erroInterno(erro, 'PATCH /api/ia/sugestoes/[id]')
  }
}
