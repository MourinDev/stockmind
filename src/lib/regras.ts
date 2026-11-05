/*
  Regras de negócio e funções de apoio.
  São funções puras: recebem dados e devolvem resultado, sem mexer em estado.
  Podem ir para o back-end (Node.js) praticamente sem alteração.
*/
import { JANELA_ANALISE_DIAS, PRAZO_ENTREGA_DIAS, diasAtras } from './dados'

export const formatarMoeda = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarData(dataTexto) {
  const [ano, mes, dia] = dataTexto.split('-')
  return `${dia}/${mes}/${ano}`
}

export const estaCritico = (produto) => produto.quantidade <= produto.estoqueMinimo

// Quanto do estoque mínimo o saldo cobre (1 = exatamente no mínimo).
// Serve para as barras de nível e para ordenar os alertas do mais grave ao menos grave.
export const nivelEstoque = (produto) => (produto.estoqueMinimo > 0 ? produto.quantidade / produto.estoqueMinimo : Infinity)

/*
  Curva ABC (Gonçalves; Pereira & Costa):
  1. valor total de cada item = quantidade x valor unitário;
  2. ordena do maior para o menor valor;
  3. soma o percentual acumulado item a item;
  4. classe A até 80% do valor do estoque, B de 80% a 95%, C de 95% a 100%.
  O item que "cruza" a linha dos 80% ainda entra na A (por isso comparamos o
  acumulado ANTES de somar o próprio item).
*/
export function calcularCurvaABC(produtos) {
  const comValor = produtos.map((p) => ({ ...p, valorTotal: p.quantidade * p.valorUnitario }))
  const valorGeral = comValor.reduce((soma, p) => soma + p.valorTotal, 0)
  const ordenados = [...comValor].sort((a, b) => b.valorTotal - a.valorTotal)

  let acumulado = 0
  return ordenados.map((p) => {
    const percentual = valorGeral > 0 ? (p.valorTotal / valorGeral) * 100 : 0
    const acumuladoAntes = acumulado
    acumulado += percentual

    let classe = 'C'
    if (acumuladoAntes < 80) classe = 'A'
    else if (acumuladoAntes < 95) classe = 'B'

    return { ...p, percentual, percentualAcumulado: acumulado, classe }
  })
}

/*
  StockMind IA: sugestão de reposição a partir do histórico de saídas.
  1. Consumo médio diário (giro) = saídas dos últimos 15 dias / 15.
  2. Autonomia (dias até a ruptura) = quantidade atual / consumo médio diário.
  3. Ponto de reposição = consumo diário x prazo de entrega + estoque mínimo.
     Quando o saldo chega nesse ponto, o pedido precisa sair hoje para a
     mercadoria chegar antes de furar o estoque mínimo.
  4. Sugestão de compra = (consumo diário x dias de cobertura + estoque mínimo)
     - quantidade atual, arredondada para cima.
  Urgência:
  - Reposição imediata: saldo já está no mínimo OU acaba antes da entrega chegar;
  - Planejar compra: saldo abaixo do ponto de reposição OU dura menos de 10 dias;
  - Estoque saudável: nenhum dos casos acima.
*/
export function calcularSugestaoIA(produto, movimentacoes, diasCobertura) {
  const inicioJanela = diasAtras(JANELA_ANALISE_DIAS)
  const totalSaidas = movimentacoes
    .filter((m) => m.produtoId === produto.id && m.tipo === 'SAIDA' && m.dataOcorrencia >= inicioJanela)
    .reduce((soma, m) => soma + m.quantidade, 0)

  const consumoMedioDiario = totalSaidas / JANELA_ANALISE_DIAS
  const autonomiaDias = consumoMedioDiario > 0 ? produto.quantidade / consumoMedioDiario : Infinity
  const pontoReposicao = Math.ceil(consumoMedioDiario * PRAZO_ENTREGA_DIAS + produto.estoqueMinimo)
  const estoqueAlvo = consumoMedioDiario * diasCobertura + produto.estoqueMinimo
  // toFixed evita que um 10.000000001 do ponto flutuante vire 11 no arredondamento
  const sugestaoCompra = Math.max(0, Math.ceil(Number((estoqueAlvo - produto.quantidade).toFixed(2))))

  let urgencia = 'Estoque Saudável'
  if (produto.quantidade <= produto.estoqueMinimo || autonomiaDias <= PRAZO_ENTREGA_DIAS) {
    urgencia = 'Reposição Imediata'
  } else if (produto.quantidade <= pontoReposicao || autonomiaDias <= 10) {
    urgencia = 'Planejar Compra'
  }

  return { totalSaidas, consumoMedioDiario, autonomiaDias, pontoReposicao, sugestaoCompra, urgencia }
}

// Simula o saldo dia a dia mantendo o consumo médio atual, até zerar ou até o fim do horizonte.
// É o que alimenta o gráfico de "projeção de ruptura" da IA.
export function projetarEstoque(quantidadeAtual, consumoMedioDiario, horizonteDias = 30) {
  const pontos = []
  for (let dia = 0; dia <= horizonteDias; dia++) {
    const saldo = Math.max(0, quantidadeAtual - consumoMedioDiario * dia)
    pontos.push({ dia, saldo: Number(saldo.toFixed(1)) })
  }
  return pontos
}

// Mesmas validações que o back-end vai repetir (nunca confiar só no front).
export function validarProduto(dados, produtos) {
  const erros = {}
  const codigo = dados.codigo.trim().toUpperCase()

  if (!codigo) erros.codigo = 'Informe o código do produto.'
  else if (produtos.some((p) => p.codigo.toUpperCase() === codigo && p.id !== dados.id)) {
    erros.codigo = `O código ${codigo} já está cadastrado em outro produto.`
  }
  if (!dados.descricao.trim()) erros.descricao = 'Informe a descrição.'
  if (!dados.categoria) erros.categoria = 'Escolha uma categoria.'

  if (dados.quantidade === '') erros.quantidade = 'Informe a quantidade.'
  else if (!Number.isInteger(Number(dados.quantidade)) || Number(dados.quantidade) < 0) {
    erros.quantidade = 'A quantidade não pode ser negativa nem fracionada.'
  }

  if (dados.estoqueMinimo === '') erros.estoqueMinimo = 'Informe o estoque mínimo.'
  else if (!Number.isInteger(Number(dados.estoqueMinimo)) || Number(dados.estoqueMinimo) < 0) {
    erros.estoqueMinimo = 'O estoque mínimo não pode ser negativo.'
  }

  if (dados.valorUnitario === '') erros.valorUnitario = 'Informe o valor unitário.'
  else if (Number(dados.valorUnitario) <= 0) erros.valorUnitario = 'O valor unitário deve ser maior que R$ 0,00.'

  return erros
}

export function baixarCSV(nomeArquivo, linhas) {
  // Ponto e vírgula + BOM para o Excel em português abrir com acentos certos
  const conteudo = linhas
    .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = nomeArquivo
  link.click()
  URL.revokeObjectURL(link.href)
}

// "Bip" curto do leitor de QR Code, gerado pelo próprio navegador (sem arquivo de áudio)
export function tocarBip() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)()
    const oscilador = audio.createOscillator()
    const volume = audio.createGain()
    oscilador.frequency.value = 1400
    volume.gain.value = 0.08
    oscilador.connect(volume).connect(audio.destination)
    oscilador.start()
    oscilador.stop(audio.currentTime + 0.12)
  } catch {
    // sem áudio disponível: a leitura segue normalmente
  }
}

export function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}
