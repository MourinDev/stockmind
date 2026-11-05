import assert from 'node:assert/strict'
import test from 'node:test'
import { PARAMETROS_IA, calcularReposicao, diaDaSemanaISO } from './reposicao.js'

function serieAte(fim: string, dias: number, quantidade: number | ((iso: string) => number)) {
  const [ano, mes, dia] = fim.split('-').map(Number)
  const itens: { dia: string; quantidade: number }[] = []
  for (let falta = dias - 1; falta >= 0; falta--) {
    const data = new Date(Date.UTC(ano, mes - 1, dia - falta))
    const iso = data.toISOString().slice(0, 10)
    itens.push({ dia: iso, quantidade: typeof quantidade === 'function' ? quantidade(iso) : quantidade })
  }
  return itens
}

test('dia da semana usa UTC e não desloca AAAA-MM-DD', () => {
  assert.equal(diaDaSemanaISO('2026-03-02'), 1)
  assert.equal(diaDaSemanaISO('2026-03-01'), 0)
})

test('consumo constante gera ponto sem estoque de segurança', () => {
  const resultado = calcularReposicao({ saldo: 4, consumoDiario: serieAte('2026-03-01', 90, 2) })
  assert.ok(resultado)
  assert.equal(resultado.consumoMedioDiario, 2)
  assert.equal(resultado.desvioPadrao, 0)
  assert.equal(resultado.estoqueSeguranca, 0)
  assert.equal(resultado.pontoReposicao, 6)
  assert.equal(resultado.quantidadeSugerida, 16)
  assert.equal(resultado.metodo, PARAMETROS_IA.metodoComSazonalidade)
  assert.equal(resultado.sugerir, true)
})

test('produto sem consumo não gera sugestão', () => {
  assert.equal(calcularReposicao({ saldo: 10, consumoDiario: serieAte('2026-03-01', 90, 0) }), null)
  assert.equal(calcularReposicao({ saldo: 10, consumoDiario: [] }), null)
})

test('histórico curto desliga a sazonalidade e não dilui com zeros anteriores', () => {
  const base = serieAte('2026-03-01', 90, 0)
  for (let i = base.length - 5; i < base.length; i++) base[i].quantidade = 10
  const resultado = calcularReposicao({ saldo: 0, consumoDiario: base })
  assert.ok(resultado)
  assert.equal(resultado.consumoMedioDiario, 10)
  assert.equal(resultado.metodo, PARAMETROS_IA.metodoSemSazonalidade)
  assert.equal(resultado.pontoReposicao, 30)
})

test('menos de 90 dias desde a primeira saída não entra na média como zero', () => {
  const base = serieAte('2026-03-01', 90, 0)
  for (let i = base.length - 20; i < base.length; i++) base[i].quantidade = 4
  const resultado = calcularReposicao({ saldo: 0, consumoDiario: base })
  assert.ok(resultado)
  assert.equal(resultado.consumoMedioDiario, 4)
  assert.equal(resultado.metodo, PARAMETROS_IA.metodoComSazonalidade)
})

test('pico de consumo eleva o ponto pelo desvio', () => {
  const constante = calcularReposicao({ saldo: 0, consumoDiario: serieAte('2026-03-01', 90, 1) })
  const pico = serieAte('2026-03-01', 90, 1)
  pico[pico.length - 1].quantidade = 80
  const resultado = calcularReposicao({ saldo: 0, consumoDiario: pico })
  assert.ok(constante)
  assert.ok(resultado)
  assert.ok(resultado.desvioPadrao > 0)
  assert.ok(resultado.estoqueSeguranca > 0)
  assert.ok(resultado.pontoReposicao > constante.pontoReposicao)
})

test('saldo acima do ponto não pede compra', () => {
  const resultado = calcularReposicao({ saldo: 1000, consumoDiario: serieAte('2026-03-01', 90, 2) })
  assert.ok(resultado)
  assert.equal(resultado.quantidadeSugerida, 0)
  assert.ok(resultado.pontoReposicao < 1000)
  assert.equal(resultado.sugerir, false)
})

test('resto de ponto flutuante abaixo de 4 casas não sobe uma unidade', () => {
  const resultado = calcularReposicao({ saldo: 0, consumoDiario: serieAte('2026-03-01', 90, 1.000001) })
  assert.ok(resultado)
  assert.equal(resultado.pontoReposicao, 3)
})
