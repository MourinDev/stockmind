import { exigirSessao } from '../../../lib/auth'
import { erroInterno, errosZod, json, jsonErro, lerJson, produtoApi, tratarErroBanco } from '../../../lib/http'
import { prisma } from '../../../lib/prisma'
import { filtroProdutosSchema, produtoSchema } from '../../../lib/validacao'

export const runtime = 'nodejs'

const comCategoria = { categoria: true }

export async function GET(request) {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const filtros = filtroProdutosSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!filtros.success) return errosZod(filtros)

    const { busca, categoria, estoqueBaixo } = filtros.data
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        ...(categoria ? { categoria: { nome: categoria } } : {}),
        ...(busca
          ? {
              OR: [
                { codigo: { contains: busca, mode: 'insensitive' } },
                { descricao: { contains: busca, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: comCategoria,
      orderBy: { descricao: 'asc' },
    })

    const lista = estoqueBaixo ? produtos.filter((produto) => produto.quantidadeAtual <= produto.estoqueMinimo) : produtos
    return json(lista.map(produtoApi))
  } catch (erro) {
    return erroInterno(erro, 'GET /api/produtos')
  }
}

export async function POST(request) {
  try {
    const acesso = await exigirSessao(['admin'])
    if (acesso.resposta) return acesso.resposta

    const validado = produtoSchema.safeParse(await lerJson(request))
    if (!validado.success) return errosZod(validado)
    if (validado.data.valorCusto == null) {
      return jsonErro(400, 'Dados inválidos.', { campos: { valorCusto: 'Informe o custo.' } })
    }

    const categoria = await prisma.categoria.findUnique({ where: { nome: validado.data.categoria } })
    if (!categoria) return jsonErro(400, 'Dados inválidos.', { campos: { categoria: 'Categoria não encontrada.' } })

    const codigo = validado.data.codigo.toUpperCase()
    const criado = await prisma.produto.create({
      data: {
        codigo,
        descricao: validado.data.descricao,
        categoriaId: categoria.id,
        estoqueMinimo: validado.data.estoqueMinimo,
        valorCusto: validado.data.valorCusto,
        valorVenda: validado.data.valorVenda,
        qrCode: codigo,
      },
      include: comCategoria,
    })
    return json(produtoApi(criado), 201)
  } catch (erro) {
    return tratarErroBanco(erro, 'POST /api/produtos')
  }
}
