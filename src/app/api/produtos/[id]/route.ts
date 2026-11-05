import { exigirSessao } from '../../../../lib/auth'
import { erroInterno, errosZod, json, jsonErro, lerJson, produtoApi, tratarErroBanco } from '../../../../lib/http'
import { prisma } from '../../../../lib/prisma'
import { produtoSchema } from '../../../../lib/validacao'

export const runtime = 'nodejs'

const comCategoria = { categoria: true }

function lerId(id) {
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) return null
  return numero
}

export async function GET(_request, { params }) {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const { id } = await params
    const produtoId = lerId(id)
    if (!produtoId) return jsonErro(400, 'Identificador inválido.')

    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, ativo: true },
      include: comCategoria,
    })
    if (!produto) return jsonErro(404, 'Produto não encontrado.')
    return json(produtoApi(produto))
  } catch (erro) {
    return erroInterno(erro, 'GET /api/produtos/[id]')
  }
}

export async function PATCH(request, { params }) {
  try {
    const acesso = await exigirSessao(['admin'])
    if (acesso.resposta) return acesso.resposta

    const { id } = await params
    const produtoId = lerId(id)
    if (!produtoId) return jsonErro(400, 'Identificador inválido.')

    const validado = produtoSchema.safeParse(await lerJson(request))
    if (!validado.success) return errosZod(validado)

    const atual = await prisma.produto.findFirst({ where: { id: produtoId, ativo: true } })
    if (!atual) return jsonErro(404, 'Produto não encontrado.')

    const categoria = await prisma.categoria.findUnique({ where: { nome: validado.data.categoria } })
    if (!categoria) return jsonErro(400, 'Dados inválidos.', { campos: { categoria: 'Categoria não encontrada.' } })

    const codigo = validado.data.codigo.toUpperCase()
    const atualizado = await prisma.produto.update({
      where: { id: produtoId },
      data: {
        codigo,
        descricao: validado.data.descricao,
        categoriaId: categoria.id,
        estoqueMinimo: validado.data.estoqueMinimo,
        valorVenda: validado.data.valorVenda,
        ...(validado.data.valorCusto != null ? { valorCusto: validado.data.valorCusto } : {}),
        qrCode: codigo,
      },
      include: comCategoria,
    })
    return json(produtoApi(atualizado))
  } catch (erro) {
    return tratarErroBanco(erro, 'PATCH /api/produtos/[id]')
  }
}

export async function DELETE(_request, { params }) {
  try {
    const acesso = await exigirSessao(['admin'])
    if (acesso.resposta) return acesso.resposta

    const { id } = await params
    const produtoId = lerId(id)
    if (!produtoId) return jsonErro(400, 'Identificador inválido.')

    const atual = await prisma.produto.findFirst({ where: { id: produtoId, ativo: true } })
    if (!atual) return jsonErro(404, 'Produto não encontrado.')

    await prisma.produto.update({ where: { id: produtoId }, data: { ativo: false } })
    return json({ ok: true })
  } catch (erro) {
    return erroInterno(erro, 'DELETE /api/produtos/[id]')
  }
}
