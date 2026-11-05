import type { StatusSugestao, SugestaoApi } from '../../types/dominio'
import { numero } from '../http'

const ORDEM_STATUS: Record<StatusSugestao, number> = { pendente: 0, aceita: 1, ignorada: 2 }

type SugestaoBruta = {
  id: number
  status: StatusSugestao
  metodo: string
  consumoMedioDiario: unknown
  pontoReposicaoSugerido: number
  quantidadeSugerida: number
  dataGeracao: Date | string
  produto: {
    id: number
    codigo: string
    descricao: string
    quantidadeAtual: number
    estoqueMinimo: number
    categoria: { nome: string }
  }
}

export function sugestaoApi(sugestao: SugestaoBruta): SugestaoApi {
  const consumo = numero(sugestao.consumoMedioDiario)
  const saldo = sugestao.produto.quantidadeAtual
  const cobertura = consumo > 0 ? Number((saldo / consumo).toFixed(4)) : null

  return {
    id: sugestao.id,
    status: sugestao.status,
    metodo: sugestao.metodo,
    consumoMedioDiario: consumo,
    pontoReposicao: sugestao.pontoReposicaoSugerido,
    quantidadeSugerida: sugestao.quantidadeSugerida,
    coberturaDias: cobertura,
    dataGeracao: sugestao.dataGeracao instanceof Date ? sugestao.dataGeracao.toISOString() : sugestao.dataGeracao,
    produto: {
      id: sugestao.produto.id,
      codigo: sugestao.produto.codigo,
      descricao: sugestao.produto.descricao,
      categoria: sugestao.produto.categoria.nome,
      saldo,
      estoqueMinimo: sugestao.produto.estoqueMinimo,
    },
  }
}

export function ordenarSugestoes(sugestoes: SugestaoApi[]) {
  return [...sugestoes].sort((a, b) => {
    const status = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]
    if (status !== 0) return status
    return (a.coberturaDias ?? Number.POSITIVE_INFINITY) - (b.coberturaDias ?? Number.POSITIVE_INFINITY)
  })
}

export const incluirProduto = {
  produto: {
    select: {
      id: true,
      codigo: true,
      descricao: true,
      quantidadeAtual: true,
      estoqueMinimo: true,
      categoria: { select: { nome: true } },
    },
  },
}
