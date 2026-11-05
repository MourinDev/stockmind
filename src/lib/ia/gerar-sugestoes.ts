import 'server-only'
import type { Prisma } from '../../generated/prisma/client'
import type { ConsumoDia, ResumoGeracao } from '../../types/dominio'
import { prisma } from '../prisma'
import { listarConsumoDiarioHistorico } from '../queries'
import { calcularReposicao } from './reposicao'

type DadosGravar = {
  produtoId: number
  consumoMedioDiario: number
  pontoReposicao: number
  quantidadeSugerida: number
  metodo: string
  dataGeracao: Date
}

async function gravarPendente(tx: Prisma.TransactionClient, dados: DadosGravar) {
  const linhas = await tx.$queryRaw<Array<{ criada: boolean }>>`
    INSERT INTO "sugestoes_reposicao" (
      "produto_id",
      "consumo_medio_diario",
      "ponto_reposicao_sugerido",
      "quantidade_sugerida",
      "data_geracao",
      "status",
      "metodo",
      "updated_at"
    ) VALUES (
      ${dados.produtoId},
      ${dados.consumoMedioDiario},
      ${dados.pontoReposicao},
      ${dados.quantidadeSugerida},
      ${dados.dataGeracao},
      'pendente'::"status_sugestao",
      ${dados.metodo},
      NOW()
    )
    ON CONFLICT ("produto_id") WHERE "status" = 'pendente'::"status_sugestao"
    DO UPDATE SET
      "consumo_medio_diario" = EXCLUDED."consumo_medio_diario",
      "ponto_reposicao_sugerido" = EXCLUDED."ponto_reposicao_sugerido",
      "quantidade_sugerida" = EXCLUDED."quantidade_sugerida",
      "data_geracao" = EXCLUDED."data_geracao",
      "metodo" = EXCLUDED."metodo",
      "updated_at" = NOW()
    RETURNING (xmax = 0) AS "criada"
  `
  return linhas[0]?.criada === true
}

export async function gerarSugestoes(): Promise<ResumoGeracao> {
  const [produtos, linhas] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, quantidadeAtual: true } }),
    listarConsumoDiarioHistorico(),
  ])

  const porProduto = new Map<number, ConsumoDia[]>()
  for (const linha of linhas) {
    const serie = porProduto.get(linha.produtoId) ?? []
    serie.push({ dia: linha.dia, quantidade: linha.quantidadeSaida })
    porProduto.set(linha.produtoId, serie)
  }

  const resumo = {
    analisados: 0,
    criadas: 0,
    atualizadas: 0,
    removidas: 0,
    puladasSemConsumo: 0,
    puladasSemNecessidade: 0,
  }
  const gravar: DadosGravar[] = []
  const remover: number[] = []

  for (const produto of produtos) {
    resumo.analisados += 1
    const resultado = calcularReposicao({
      saldo: produto.quantidadeAtual,
      consumoDiario: porProduto.get(produto.id) ?? [],
    })
    if (!resultado) {
      resumo.puladasSemConsumo += 1
      remover.push(produto.id)
      continue
    }
    if (!resultado.sugerir) {
      resumo.puladasSemNecessidade += 1
      remover.push(produto.id)
      continue
    }
    gravar.push({
      produtoId: produto.id,
      consumoMedioDiario: resultado.consumoMedioDiario,
      pontoReposicao: resultado.pontoReposicao,
      quantidadeSugerida: resultado.quantidadeSugerida,
      metodo: resultado.metodo,
      dataGeracao: new Date(),
    })
  }

  await prisma.$transaction(async (tx) => {
    for (const produtoId of remover) {
      const apagadas = await tx.sugestaoReposicao.deleteMany({ where: { produtoId, status: 'pendente' } })
      resumo.removidas += apagadas.count
    }
    for (const dados of gravar) {
      const criada = await gravarPendente(tx, dados)
      if (criada) resumo.criadas += 1
      else resumo.atualizadas += 1
    }
  })

  return resumo
}
