import { NextResponse } from 'next/server'

export function json(dados, status = 200) {
  return NextResponse.json(dados, { status })
}

export function jsonErro(status, erro, extra) {
  return NextResponse.json(extra ? { erro, ...extra } : { erro }, { status })
}

export function numero(valor) {
  if (valor == null) return 0
  if (typeof valor === 'number') return valor
  if (typeof valor === 'bigint') return Number(valor)
  if (typeof valor.toNumber === 'function') return valor.toNumber()
  return Number(valor)
}

export async function lerJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function errosZod(resultado) {
  const campos = {}
  for (const issue of resultado.error.issues) {
    const campo = issue.path.join('.') || 'corpo'
    if (!campos[campo]) campos[campo] = issue.message
  }
  return jsonErro(400, 'Dados inválidos.', { campos })
}

export function erroInterno(erro, contexto) {
  console.error(`[${contexto}]`, erro)
  return jsonErro(500, 'Não foi possível concluir a operação.')
}

function textoDoErro(erro, vistos = new Set()) {
  if (!erro || vistos.has(erro)) return ''
  vistos.add(erro)
  const partes = []
  if (typeof erro.message === 'string') partes.push(erro.message)
  if (erro.meta) partes.push(JSON.stringify(erro.meta))
  if (erro.cause) partes.push(textoDoErro(erro.cause, vistos))
  return partes.join(' ')
}

function codigoPrisma(erro, vistos = new Set()) {
  if (!erro || vistos.has(erro)) return null
  vistos.add(erro)
  if (typeof erro.code === 'string') return erro.code
  return codigoPrisma(erro.cause, vistos)
}

const SALDO = /Saldo insuficiente:.*?tem só (\d+) unidade\(s\) e a saída pedida é de (\d+)/

export function mensagemSaldoInsuficiente(erro) {
  const texto = textoDoErro(erro)
  if (!texto.includes('Saldo insuficiente')) return null
  const encontrado = texto.match(SALDO)
  if (!encontrado) return 'Saldo insuficiente.'
  return `Saldo insuficiente: disponível ${encontrado[1]}, solicitado ${encontrado[2]}`
}

export function mensagemDuplicidade(erro) {
  if (codigoPrisma(erro) !== 'P2002') return null
  const texto = textoDoErro(erro)
  if (texto.includes('qr_code') || texto.includes('qrCode')) return 'QR Code já cadastrado.'
  if (texto.includes('codigo')) return 'Código já cadastrado.'
  return 'Já existe um registro com esses dados.'
}

export function tratarErroBanco(erro, contexto) {
  const saldo = mensagemSaldoInsuficiente(erro)
  if (saldo) return jsonErro(422, saldo)
  const duplicado = mensagemDuplicidade(erro)
  if (duplicado) return jsonErro(409, duplicado)
  return erroInterno(erro, contexto)
}

export function produtoApi(produto) {
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

export function movimentacaoApi(movimentacao) {
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
