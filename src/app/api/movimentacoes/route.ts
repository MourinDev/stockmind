import { exigirSessao } from '../../../lib/auth'
import { erroInterno, errosZod, json, jsonErro, lerJson, movimentacaoApi, produtoApi, tratarErroBanco } from '../../../lib/http'
import { prisma } from '../../../lib/prisma'
import { filtroMovimentacoesSchema, movimentacaoSchema } from '../../../lib/validacao'

export const runtime = 'nodejs'

const incluir = {
  usuario: { select: { id: true, nome: true } },
  produto: { select: { id: true, codigo: true, descricao: true } },
}

function inicioDoDia(dia) {
  return new Date(`${dia}T00:00:00.000-03:00`)
}

function fimDoDia(dia) {
  return new Date(`${dia}T23:59:59.999-03:00`)
}

export async function GET(request) {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta

    const filtros = filtroMovimentacoesSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!filtros.success) return errosZod(filtros)

    const { produtoId, tipo, de, ate, pagina, porPagina } = filtros.data
    const where = {
      ...(produtoId ? { produtoId } : {}),
      ...(tipo ? { tipo } : {}),
      ...(de || ate
        ? {
            dataHora: {
              ...(de ? { gte: inicioDoDia(de) } : {}),
              ...(ate ? { lte: fimDoDia(ate) } : {}),
            },
          }
        : {}),
    }

    const [total, itens] = await Promise.all([
      prisma.movimentacao.count({ where }),
      prisma.movimentacao.findMany({
        where,
        include: incluir,
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ])

    return json({ itens: itens.map(movimentacaoApi), total, pagina, porPagina })
  } catch (erro) {
    return erroInterno(erro, 'GET /api/movimentacoes')
  }
}

export async function POST(request) {
  try {
    const acesso = await exigirSessao(['admin', 'operador'])
    if (acesso.resposta) return acesso.resposta

    const validado = movimentacaoSchema.safeParse(await lerJson(request))
    if (!validado.success) return errosZod(validado)

    const produto = await prisma.produto.findUnique({ where: { id: validado.data.produtoId } })
    if (!produto) return jsonErro(404, 'Produto não encontrado.')
    if (!produto.ativo) return jsonErro(422, 'Produto inativo. Não é possível registrar movimentação.')

    const valorUnitario = validado.data.tipo === 'entrada' ? produto.valorCusto : produto.valorVenda
    const criada = await prisma.movimentacao.create({
      data: {
        produtoId: produto.id,
        usuarioId: acesso.sessao.id,
        tipo: validado.data.tipo,
        quantidade: validado.data.quantidade,
        valorUnitario,
        observacao: validado.data.observacao || null,
        dataHora: new Date(),
      },
      include: incluir,
    })

    const atualizado = await prisma.produto.findUnique({
      where: { id: produto.id },
      include: { categoria: true },
    })

    return json({ movimentacao: movimentacaoApi(criada), produto: produtoApi(atualizado) }, 201)
  } catch (erro) {
    return tratarErroBanco(erro, 'POST /api/movimentacoes')
  }
}
