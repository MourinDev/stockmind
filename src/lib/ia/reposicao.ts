/*
  Sugestão de reposição. Função pura: não lê banco, não importa tela nem dados.js.
  O prazo de entrega replica PRAZO_ENTREGA_DIAS de src/lib/dados.js.
*/
export const PARAMETROS_IA = {
  janelas: [30, 60, 90],
  pesos: [0.5, 0.3, 0.2],
  prazoEntregaDias: 3,
  diasCobertura: 7,
  nivelServicoZ: 1.65,
  minimoDiasSazonalidade: 14,
  metodoComSazonalidade: 'media_ponderada_sazonal_v1',
  metodoSemSazonalidade: 'media_ponderada_v1',
}

export function diaDaSemanaISO(dia) {
  const [ano, mes, diaMes] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, diaMes)).getUTCDay()
}

function paraCima(valor) {
  if (!Number.isFinite(valor) || valor <= 0) return 0
  return Math.ceil(Number(valor.toFixed(4)))
}

function media(valores) {
  if (!valores.length) return 0
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length
}

function desvioAmostral(valores) {
  if (valores.length < 2) return 0
  const base = media(valores)
  const soma = valores.reduce((acumulado, valor) => acumulado + (valor - base) ** 2, 0)
  return Math.sqrt(soma / (valores.length - 1))
}

function somarDias(dia, quantidade) {
  const [ano, mes, diaMes] = dia.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, diaMes + quantidade))
  const mesNovo = String(data.getUTCMonth() + 1).padStart(2, '0')
  const diaNovo = String(data.getUTCDate()).padStart(2, '0')
  return `${data.getUTCFullYear()}-${mesNovo}-${diaNovo}`
}

function mediaDaJanela(quantidades, dias) {
  const trecho = quantidades.length >= dias ? quantidades.slice(-dias) : quantidades
  return media(trecho)
}

export function calcularReposicao({ saldo, consumoDiario }, parametros = PARAMETROS_IA) {
  const saldoAtual = Number.isFinite(saldo) ? saldo : 0
  const serie = [...(consumoDiario ?? [])]
    .filter((item) => item && typeof item.dia === 'string' && Number.isFinite(item.quantidade))
    .sort((a, b) => a.dia.localeCompare(b.dia))

  const inicio = serie.findIndex((item) => item.quantidade > 0)
  if (inicio < 0) return null

  const historico = serie.slice(inicio)
  const quantidades = historico.map((item) => item.quantidade)
  const [peso30, peso60, peso90] = parametros.pesos
  const [janela30, janela60, janela90] = parametros.janelas
  const consumoMedio =
    peso30 * mediaDaJanela(quantidades, janela30) +
    peso60 * mediaDaJanela(quantidades, janela60) +
    peso90 * mediaDaJanela(quantidades, janela90)

  if (!(consumoMedio > 0) || !Number.isFinite(consumoMedio)) return null

  const desvio = desvioAmostral(quantidades)
  const estoqueSeguranca = parametros.nivelServicoZ * desvio * Math.sqrt(parametros.prazoEntregaDias)
  const sazonal = quantidades.length >= parametros.minimoDiasSazonalidade
  const mediaSimples = media(quantidades)
  const fatores = [1, 1, 1, 1, 1, 1, 1]

  if (sazonal && mediaSimples > 0) {
    const grupos = [[], [], [], [], [], [], []]
    for (const item of historico) grupos[diaDaSemanaISO(item.dia)].push(item.quantidade)
    for (let dia = 0; dia < 7; dia++) {
      fatores[dia] = grupos[dia].length ? media(grupos[dia]) / mediaSimples : 1
    }
  }

  function demanda(horizonte) {
    const ultimoDia = historico[historico.length - 1].dia
    let soma = 0
    for (let passo = 1; passo <= horizonte; passo++) {
      const dia = somarDias(ultimoDia, passo)
      soma += consumoMedio * fatores[diaDaSemanaISO(dia)]
    }
    return soma
  }

  const pontoReposicao = paraCima(demanda(parametros.prazoEntregaDias) + estoqueSeguranca)
  const quantidadeSugerida = Math.max(
    0,
    paraCima(demanda(parametros.prazoEntregaDias + parametros.diasCobertura) + estoqueSeguranca - saldoAtual),
  )
  const coberturaDias = saldoAtual / consumoMedio

  return {
    consumoMedioDiario: Number(consumoMedio.toFixed(4)),
    desvioPadrao: Number(desvio.toFixed(4)),
    estoqueSeguranca: Number(estoqueSeguranca.toFixed(4)),
    pontoReposicao,
    quantidadeSugerida,
    coberturaDias: Number(coberturaDias.toFixed(4)),
    metodo: sazonal ? parametros.metodoComSazonalidade : parametros.metodoSemSazonalidade,
    sugerir: saldoAtual <= pontoReposicao && quantidadeSugerida > 0,
  }
}
