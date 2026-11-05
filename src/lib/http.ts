import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import type { MovimentacaoApi, ProdutoApi } from '../types/dominio'

export function json(dados: unknown, status = 200) {
  return NextResponse.json(dados, { status })
}

export function jsonErro(status: number, erro: string, extra?: Record<string, unknown>) {
  return NextResponse.json(extra ? { erro, ...extra } : { erro }, { status })
}

export function numero(valor: unknown) {
  if (valor == null) return 0
  if (typeof valor === 'number') return valor
  if (typeof valor === 'bigint') return Number(valor)
  if (typeof valor === 'object' && 'toNumber' in valor && typeof valor.toNumber === 'function') {
    return Number(valor.toNumber())
  }
  return Number(valor)
}

export async function lerJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function errosZod(resultado: { error: ZodError }) {
  const campos: Record<string, string> = {}
  for (const issue of resultado.error.issues) {
    const campo = issue.path.join('.') || 'corpo'
    if (!campos[campo]) campos[campo] = issue.message
  }
  return jsonErro(400, 'Dados inválidos.', { campos })
}

export function erroInterno(erro: unknown, contexto: string) {
  console.error(`[${contexto}]`, erro)
  return jsonErro(500, 'Não foi possível concluir a operação.')
}

type ErroEncadeado = {
  message?: unknown
  meta?: unknown
  code?: unknown
  cause?: unknown
}

function comoErro(valor: unknown): ErroEncadeado | null {
  if (!valor || typeof valor !== 'object') return null
  return valor
}

function textoDoErro(erro: unknown, vistos = new Set<object>()): string {
  const atual = comoErro(erro)
  if (!atual || vistos.has(atual)) return ''
  vistos.add(atual)
  const partes = []
  if (typeof atual.message === 'string') partes.push(atual.message)
  if (atual.meta) partes.push(JSON.stringify(atual.meta))
  if (atual.cause) partes.push(textoDoErro(atual.cause, vistos))
  return partes.join(' ')
}

function codigoPrisma(erro: unknown, vistos = new Set<object>()): string | null {
  const atual = comoErro(erro)
  if (!atual || vistos.has(atual)) return null
  vistos.add(atual)
  if (typeof atual.code === 'string') return atual.code
  return codigoPrisma(atual.cause, vistos)
}

const SALDO = /Saldo insuficiente:.*?tem só (\d+) unidade\(s\) e a saída pedida é de (\d+)/

export function mensagemSaldoInsuficiente(erro: unknown) {
  const texto = textoDoErro(erro)
  if (!texto.includes('Saldo insuficiente')) return null
  const encontrado = texto.match(SALDO)
  if (!encontrado) return 'Saldo insuficiente.'
  return `Saldo insuficiente: disponível ${encontrado[1]}, solicitado ${encontrado[2]}`
}

export function mensagemDuplicidade(erro: unknown) {
  if (codigoPrisma(erro) !== 'P2002') return null
  const texto = textoDoErro(erro)
  if (texto.includes('qr_code') || texto.includes('qrCode')) return 'QR Code já cadastrado.'
  if (texto.includes('codigo')) return 'Código já cadastrado.'
  return 'Já existe um registro com esses dados.'
}

export function tratarErroBanco(erro: unknown, contexto: string) {
  const saldo = mensagemSaldoInsuficiente(erro)
  if (saldo) return jsonErro(422, saldo)
  const duplicado = mensagemDuplicidade(erro)
  if (duplicado) return jsonErro(409, duplicado)
  return erroInterno(erro, contexto)
}

type ProdutoComCategoria = {
  id: number
  codigo: string
  descricao: string
  categoria?: { nome: string } | null
  categoriaId: number
  quantidadeAtual: number
  estoqueMinimo: number
  valorCusto: unknown
  valorVenda: unknown
  qrCode: string
  ativo: boolean
}

export function produtoApi(produto: ProdutoComCategoria): ProdutoApi {
  return {
    id: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    categoria: produto.categoria?.nome ?? null,
    categoriaId: produto.categoriaId,
    quantidadeAtual: produto.quantidadeAtual,
    estoqueMinimo: produto.estoqueMinimo,
    valorCusto: numero(produto.valorCusto),
    valorVenda: numero(produto.valorVenda),
    qrCode: produto.qrCode,
    ativo: produto.ativo,
  }
}

type MovimentacaoComRelacoes = {
  id: number
  produtoId: number
  usuarioId: number
  tipo: 'entrada' | 'saida'
  quantidade: number
  valorUnitario: unknown
  observacao: string | null
  dataHora: Date | string
  usuario?: { id: number; nome: string } | null
  produto?: { id: number; codigo: string; descricao: string } | null
}

export function movimentacaoApi(movimentacao: MovimentacaoComRelacoes): MovimentacaoApi {
  return {
    id: movimentacao.id,
    produtoId: movimentacao.produtoId,
    usuarioId: movimentacao.usuarioId,
    tipo: movimentacao.tipo,
    quantidade: movimentacao.quantidade,
    valorUnitario: numero(movimentacao.valorUnitario),
    observacao: movimentacao.observacao,
    dataHora: movimentacao.dataHora instanceof Date ? movimentacao.dataHora.toISOString() : movimentacao.dataHora,
    usuario: movimentacao.usuario ? { id: movimentacao.usuario.id, nome: movimentacao.usuario.nome } : undefined,
    produto: movimentacao.produto
      ? { id: movimentacao.produto.id, codigo: movimentacao.produto.codigo, descricao: movimentacao.produto.descricao }
      : undefined,
  }
}
