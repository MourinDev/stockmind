'use client'

/*
  TELA 5: sugestões de reposição gravadas pelo servidor.
  Aceitar só muda o status. A entrada no estoque continua na tela de movimentações.
*/
import { useEffect, useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BrainCircuit, CalendarClock, CheckCircle2, Clock, PackageCheck, RefreshCw, X, type LucideIcon } from 'lucide-react'
import { COR_ENTRADA, PRAZO_ENTREGA_DIAS } from '../../lib/dados'
import { formatarData, projetarEstoque } from '../../lib/regras'
import type { StatusSugestao, SugestaoApi } from '../../types/dominio'
import type { ValorEstoque } from '../../types/estoque'
import { Botao, Cartao, EstadoVazio, IconeCategoria, Selo, TituloTela, TooltipGrafico, animarGraficos } from '../ui'

const HORIZONTE_PROJECAO = 30
const ROTULO_STATUS = { pendente: 'Pendente', aceita: 'Aceita', ignorada: 'Ignorada' }
const ESTILO_STATUS: Record<StatusSugestao, { cor: 'amarelo' | 'verde' | 'cinza'; icone: LucideIcon }> = {
  pendente: { cor: 'amarelo', icone: Clock },
  aceita: { cor: 'verde', icone: CheckCircle2 },
  ignorada: { cor: 'cinza', icone: X },
}

function dataCurta(iso: string) {
  const data = new Date(iso)
  const texto = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data)
  return formatarData(texto)
}

function ResumoUrgencia({ titulo, valor, detalhe, icone: Icone, classes }: { titulo: string; valor: ReactNode; detalhe: string; icone: LucideIcon; classes: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icone size={16} /> {titulo}
      </div>
      <p className="mt-1 text-3xl font-extrabold">{valor}</p>
      <p className="text-xs opacity-80">{detalhe}</p>
    </div>
  )
}

export default function TelaIA({ podeGerenciar, listarSugestoes, gerarSugestoes, decidirSugestao, mostrarAviso }: { podeGerenciar: boolean; listarSugestoes: ValorEstoque['listarSugestoes']; gerarSugestoes: ValorEstoque['gerarSugestoes']; decidirSugestao: ValorEstoque['decidirSugestao']; mostrarAviso: ValorEstoque['mostrarAviso'] }) {
  const [sugestoes, setSugestoes] = useState<SugestaoApi[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [resumo, setResumo] = useState('')
  const [sugestaoGraficoId, setSugestaoGraficoId] = useState<number | null>(null)

  async function carregar() {
    const resultado = await listarSugestoes()
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    setErro('')
    setSugestoes(resultado.sugestoes)
    setSugestaoGraficoId((atual) => atual ?? resultado.sugestoes[0]?.id ?? null)
  }

  useEffect(() => {
    let ativo = true
    listarSugestoes().then((resultado) => {
      if (!ativo) return
      setCarregando(false)
      if (!resultado.ok) {
        setErro(resultado.erro)
        return
      }
      setSugestoes(resultado.sugestoes)
      setSugestaoGraficoId(resultado.sugestoes[0]?.id ?? null)
    })
    return () => {
      ativo = false
    }
  }, [listarSugestoes])

  const itemGrafico = sugestoes.find((item) => item.id === sugestaoGraficoId) ?? sugestoes[0]
  const projecao = itemGrafico ? projetarEstoque(itemGrafico.produto.saldo, itemGrafico.consumoMedioDiario, HORIZONTE_PROJECAO) : []
  const contagem = (status: StatusSugestao) => sugestoes.filter((item) => item.status === status).length
  const pendentes = sugestoes.filter((item) => item.status === 'pendente')

  async function gerar() {
    setGerando(true)
    const resultado = await gerarSugestoes()
    setGerando(false)
    if (!resultado.ok) {
      mostrarAviso(resultado.erro, 'erro')
      return
    }
    const texto = `${resultado.resumo.criadas} criadas, ${resultado.resumo.atualizadas} atualizadas, ${resultado.resumo.removidas} encerradas.`
    setResumo(texto)
    mostrarAviso(`Sugestões geradas: ${texto}`)
    await carregar()
  }

  async function decidir(item: SugestaoApi, status: 'aceita' | 'ignorada') {
    const resultado = await decidirSugestao(item.id, status)
    if (!resultado.ok) {
      mostrarAviso(resultado.erro, 'erro')
      return
    }
    setSugestoes((lista) => lista.map((atual) => (atual.id === item.id ? resultado.sugestao : atual)))
    mostrarAviso(status === 'aceita' ? `Sugestão de ${item.produto.descricao} aceita.` : `Sugestão de ${item.produto.descricao} ignorada.`)
  }

  return (
    <>
      <TituloTela titulo="StockMind IA" subtitulo="Sugestão de reposição pela média ponderada, estoque de segurança e sazonalidade semanal">
        {podeGerenciar && (
          <Botao variante="ia" onClick={gerar} disabled={gerando}>
            <RefreshCw size={18} /> {gerando ? 'Gerando…' : 'Gerar sugestões'}
          </Botao>
        )}
      </TituloTela>

      {resumo && <p className="mb-4 text-sm text-slate-600">{resumo}</p>}
      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ResumoUrgencia titulo="Pendentes" valor={contagem('pendente')} detalhe="aguardam o gestor" icone={AlertTriangle} classes="border-amber-200 bg-amber-50 text-amber-900" />
        <ResumoUrgencia titulo="Aceitas" valor={contagem('aceita')} detalhe="sem lançar entrada" icone={CheckCircle2} classes="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <ResumoUrgencia titulo="Ignoradas" valor={contagem('ignorada')} detalhe="ficam no histórico" icone={X} classes="border-slate-200 bg-slate-50 text-slate-700" />
        <ResumoUrgencia titulo="Para repor" valor={pendentes.length} detalhe="sugestões ainda abertas" icone={Clock} classes="border-blue-200 bg-blue-50 text-blue-900" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        {itemGrafico && (
          <Cartao
            titulo="Projeção de ruptura"
            subtitulo="Saldo previsto dia a dia mantendo o consumo médio gravado"
            className="lg:col-span-3"
            acao={
              <select
                value={itemGrafico.id}
                onChange={(e) => setSugestaoGraficoId(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-royal-claro"
              >
                {sugestoes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.produto.descricao}
                  </option>
                ))}
              </select>
            }
          >
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <p className="text-slate-500">
                Giro: <strong className="text-slate-900">{itemGrafico.consumoMedioDiario.toFixed(2)} un./dia</strong>
              </p>
              <p className="text-slate-500">
                Cobertura: <strong className="text-slate-900">{itemGrafico.coberturaDias == null ? '—' : `${itemGrafico.coberturaDias.toFixed(1)} dias`}</strong>
              </p>
              <p className="text-slate-500">
                Sugestão: <strong className="text-royal">{itemGrafico.quantidadeSugerida} un.</strong>
              </p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projecao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tickFormatter={(d) => (d === 0 ? 'hoje' : `+${d}`)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis
                    domain={[0, Math.ceil(Math.max(itemGrafico.produto.saldo, itemGrafico.produto.estoqueMinimo, itemGrafico.pontoReposicao) * 1.15) || 1]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<TooltipGrafico formatarRotulo={(d) => (d === 0 ? 'Hoje' : `Daqui a ${d} dias`)} formatarValor={(v) => `${v} un.`} />}
                    cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                  />
                  <ReferenceLine y={itemGrafico.produto.estoqueMinimo} stroke="#DC2626" strokeDasharray="5 4" label={{ value: 'Mínimo', position: 'insideTopRight', fill: '#DC2626', fontSize: 11 }} />
                  <ReferenceLine x={PRAZO_ENTREGA_DIAS} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Entrega', position: 'insideTopLeft', fill: '#64748b', fontSize: 11 }} />
                  <Line isAnimationActive={animarGraficos} type="linear" dataKey="saldo" name="Saldo previsto" stroke={COR_ENTRADA} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Cartao>
        )}

        <Cartao className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-teal-marca text-white">
              <BrainCircuit size={22} />
            </div>
            <div>
              <p className="font-bold text-slate-900">Como a IA calcula</p>
              <p className="text-xs text-slate-500">Análise estatística, dá para conferir na mão</p>
            </div>
          </div>
          <ol className="space-y-3 text-sm">
            {[
              ['Consumo médio', '0,5 × média de 30 dias + 0,3 × 60 + 0,2 × 90'],
              ['Estoque de segurança', '1,65 × desvio diário × raiz do prazo de 3 dias'],
              ['Ponto de reposição', 'demanda dos próximos 3 dias + estoque de segurança'],
              ['Quantidade sugerida', 'demanda de 10 dias + segurança − saldo atual'],
            ].map(([nome, formula], i) => (
              <li key={nome} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                <p className="text-slate-600">
                  <strong className="text-slate-900">{nome}</strong> = {formula}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-slate-400" />
            Com 14 dias ou mais desde a primeira saída, a demanda de cada dia futuro é ajustada pelo fator daquele dia da semana. Aceitar a sugestão não dá entrada no estoque.
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Sugestões gravadas" subtitulo="Pendentes primeiro, da menor cobertura para a maior">
        {carregando ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando sugestões…</p>
        ) : sugestoes.length === 0 ? (
          <EstadoVazio icone={PackageCheck} titulo="Nenhuma sugestão pendente" texto="Todos os produtos estão com estoque adequado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-3">Produto</th>
                  <th className="pb-3 pr-3 text-right">Saldo</th>
                  <th className="pb-3 pr-3 text-right">Consumo/dia</th>
                  <th className="pb-3 pr-3 text-right">Ponto</th>
                  <th className="pb-3 pr-3 text-right">Sugestão</th>
                  <th className="pb-3 pr-3 text-right">Cobertura</th>
                  <th className="pb-3 pr-3">Gerada em</th>
                  <th className="pb-3 pr-3">Método</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((item) => {
                  const estilo = ESTILO_STATUS[item.status]
                  const selecionado = item.id === itemGrafico?.id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSugestaoGraficoId(item.id)}
                      className={`cursor-pointer border-b border-slate-100 transition ${selecionado ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <IconeCategoria categoria={item.produto.categoria} tamanho="sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{item.produto.descricao}</p>
                            <p className="text-xs text-slate-500">{item.produto.codigo} · mínimo {item.produto.estoqueMinimo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right font-bold text-slate-900">{item.produto.saldo}</td>
                      <td className="py-3 pr-3 text-right text-slate-700">{item.consumoMedioDiario.toFixed(2)}</td>
                      <td className="py-3 pr-3 text-right text-slate-700">{item.pontoReposicao}</td>
                      <td className="py-3 pr-3 text-right font-extrabold text-royal">{item.quantidadeSugerida} un.</td>
                      <td className="py-3 pr-3 text-right text-slate-700">{item.coberturaDias == null ? '—' : item.coberturaDias.toFixed(1)}</td>
                      <td className="py-3 pr-3 text-slate-600">{dataCurta(item.dataGeracao)}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-slate-500">{item.metodo}</td>
                      <td className="py-3 pr-3">
                        <Selo cor={estilo.cor} icone={estilo.icone}>{ROTULO_STATUS[item.status]}</Selo>
                      </td>
                      <td className="py-3 text-right">
                        {podeGerenciar && item.status === 'pendente' && (
                          <div className="flex justify-end gap-2">
                            <Botao variante="secundario" className="px-3 py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); decidir(item, 'ignorada') }}>
                              Ignorar
                            </Botao>
                            <Botao className="px-3 py-1.5 text-xs" onClick={(e) => { e.stopPropagation(); decidir(item, 'aceita') }}>
                              <PackageCheck size={14} /> Aceitar
                            </Botao>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  )
}
