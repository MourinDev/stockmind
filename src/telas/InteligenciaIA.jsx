/*
  TELA 5: StockMind IA - sugestão inteligente de reposição.
*/
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BrainCircuit, CalendarClock, CheckCircle2, Clock, PackageCheck, ShoppingCart } from 'lucide-react'
import { COR_ENTRADA, JANELA_ANALISE_DIAS, PRAZO_ENTREGA_DIAS, dataISO } from '../dados'
import { calcularSugestaoIA, formatarMoeda, projetarEstoque } from '../regras'
import { Abas, Botao, Cartao, IconeCategoria, Modal, Selo, TituloTela, TooltipGrafico, animarGraficos } from '../componentes/ui'

const ORDEM_URGENCIA = { 'Reposição Imediata': 0, 'Planejar Compra': 1, 'Estoque Saudável': 2 }
const ESTILO_URGENCIA = {
  'Reposição Imediata': { cor: 'vermelho', icone: AlertTriangle },
  'Planejar Compra': { cor: 'amarelo', icone: Clock },
  'Estoque Saudável': { cor: 'verde', icone: CheckCircle2 },
}
const HORIZONTE_PROJECAO = 30

const textoAutonomia = (dias) => (dias === Infinity ? 'Sem saídas' : `${dias.toFixed(1)} dias`)

function ResumoUrgencia({ titulo, valor, detalhe, icone: Icone, classes }) {
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

export default function TelaIA({ produtos, movimentacoes, registrarMovimentacao, registrarMovimentacoes, mostrarAviso }) {
  const [diasCobertura, setDiasCobertura] = useState(15)
  const [ordemAberta, setOrdemAberta] = useState(false)

  const analise = useMemo(
    () =>
      produtos
        .map((p) => ({ produto: p, ...calcularSugestaoIA(p, movimentacoes, diasCobertura) }))
        .sort((a, b) => ORDEM_URGENCIA[a.urgencia] - ORDEM_URGENCIA[b.urgencia] || a.autonomiaDias - b.autonomiaDias),
    [produtos, movimentacoes, diasCobertura],
  )

  const [produtoGraficoId, setProdutoGraficoId] = useState(analise[0]?.produto.id)
  const itemGrafico = analise.find((item) => item.produto.id === produtoGraficoId) ?? analise[0]
  const projecao = itemGrafico ? projetarEstoque(itemGrafico.produto.quantidade, itemGrafico.consumoMedioDiario, HORIZONTE_PROJECAO) : []

  const contagem = (urgencia) => analise.filter((item) => item.urgencia === urgencia).length
  const itensDaOrdem = analise.filter((item) => item.urgencia !== 'Estoque Saudável' && item.sugestaoCompra > 0)
  const custoOrdem = itensDaOrdem.reduce((s, item) => s + item.sugestaoCompra * item.produto.valorUnitario, 0)

  function aplicarSugestao(item) {
    registrarMovimentacao({
      produtoId: item.produto.id,
      tipo: 'ENTRADA',
      quantidade: item.sugestaoCompra,
      dataOcorrencia: dataISO(new Date()),
      observacao: 'Reposição sugerida pela StockMind IA',
    })
  }

  function receberOrdemCompleta() {
    const resultado = registrarMovimentacoes(
      itensDaOrdem.map((item) => ({
        produtoId: item.produto.id,
        tipo: 'ENTRADA',
        quantidade: item.sugestaoCompra,
        dataOcorrencia: dataISO(new Date()),
        observacao: 'Ordem de reposição da StockMind IA',
      })),
    )
    if (resultado.ok) mostrarAviso(`Ordem recebida: ${itensDaOrdem.length} produtos repostos (${formatarMoeda(custoOrdem)}).`)
    else mostrarAviso(resultado.erro, 'erro')
    setOrdemAberta(false)
  }

  return (
    <>
      <TituloTela titulo="StockMind IA" subtitulo={`Sugestão de reposição a partir do giro dos últimos ${JANELA_ANALISE_DIAS} dias`}>
        <Abas
          valor={diasCobertura}
          onMudar={setDiasCobertura}
          opcoes={[
            { valor: 15, rotulo: 'Cobrir 15 dias' },
            { valor: 30, rotulo: 'Cobrir 30 dias' },
          ]}
        />
        <Botao variante="ia" onClick={() => setOrdemAberta(true)} disabled={itensDaOrdem.length === 0}>
          <ShoppingCart size={18} /> Gerar ordem ({itensDaOrdem.length})
        </Botao>
      </TituloTela>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ResumoUrgencia titulo="Repor já" valor={contagem('Reposição Imediata')} detalhe="acabam antes da entrega" icone={AlertTriangle} classes="border-red-200 bg-red-50 text-red-800" />
        <ResumoUrgencia titulo="Planejar compra" valor={contagem('Planejar Compra')} detalhe="perto do ponto de reposição" icone={Clock} classes="border-amber-200 bg-amber-50 text-amber-900" />
        <ResumoUrgencia titulo="Saudáveis" valor={contagem('Estoque Saudável')} detalhe="estoque cobre o giro" icone={CheckCircle2} classes="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <ResumoUrgencia titulo="Custo da ordem" valor={formatarMoeda(custoOrdem)} detalhe={`para ${diasCobertura} dias de cobertura`} icone={ShoppingCart} classes="border-blue-200 bg-blue-50 text-blue-900" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        {itemGrafico && (
          <Cartao
            titulo="Projeção de ruptura"
            subtitulo="Saldo previsto dia a dia mantendo o giro atual"
            className="lg:col-span-3"
            acao={
              <select
                value={itemGrafico.produto.id}
                onChange={(e) => setProdutoGraficoId(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-royal-claro"
              >
                {analise.map((item) => (
                  <option key={item.produto.id} value={item.produto.id}>
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
                Zera em: <strong className="text-slate-900">{textoAutonomia(itemGrafico.autonomiaDias)}</strong>
              </p>
              <p className="text-slate-500">
                Sugestão: <strong className="text-royal">{itemGrafico.sugestaoCompra} un.</strong>
              </p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projecao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tickFormatter={(d) => (d === 0 ? 'hoje' : `+${d}`)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis
                    // o eixo vai até o maior entre saldo, mínimo e ponto de reposição, para as linhas de referência aparecerem
                    domain={[0, Math.ceil(Math.max(itemGrafico.produto.quantidade, itemGrafico.produto.estoqueMinimo, itemGrafico.pontoReposicao) * 1.15)]}
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
              <p className="text-xs text-slate-500">Modelo transparente, dá para conferir na mão</p>
            </div>
          </div>
          <ol className="space-y-3 text-sm">
            {[
              ['Giro diário', `saídas dos últimos ${JANELA_ANALISE_DIAS} dias ÷ ${JANELA_ANALISE_DIAS}`],
              ['Autonomia', 'saldo atual ÷ giro diário'],
              ['Ponto de reposição', `giro × ${PRAZO_ENTREGA_DIAS} dias de entrega + estoque mínimo`],
              ['Sugestão de compra', `giro × ${diasCobertura} dias + estoque mínimo − saldo atual`],
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
            Repor já quando o saldo está no mínimo ou acaba antes da entrega; planejar quando está abaixo do ponto de reposição ou dura menos de 10 dias.
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Análise por produto" subtitulo="Toque numa linha para ver a projeção">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-3">Produto</th>
                <th className="pb-3 pr-3 text-right">Saldo</th>
                <th className="pb-3 pr-3 text-right">Giro/dia</th>
                <th className="pb-3 pr-3">Autonomia</th>
                <th className="pb-3 pr-3 text-right">Ponto rep.</th>
                <th className="pb-3 pr-3 text-right">Sugestão</th>
                <th className="pb-3 pr-3">Urgência</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {analise.map((item) => {
                const { cor, icone } = ESTILO_URGENCIA[item.urgencia]
                const selecionado = item.produto.id === itemGrafico?.produto.id
                const autonomiaBarra = item.autonomiaDias === Infinity ? 100 : Math.min(100, (item.autonomiaDias / HORIZONTE_PROJECAO) * 100)
                return (
                  <tr
                    key={item.produto.id}
                    onClick={() => setProdutoGraficoId(item.produto.id)}
                    className={`cursor-pointer border-b border-slate-100 transition ${selecionado ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <IconeCategoria categoria={item.produto.categoria} tamanho="sm" />
                        <div>
                          <p className="font-semibold text-slate-900">{item.produto.descricao}</p>
                          <p className="text-xs text-slate-500">mínimo {item.produto.estoqueMinimo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-bold text-slate-900">{item.produto.quantidade}</td>
                    <td className="py-3 pr-3 text-right text-slate-700">{item.consumoMedioDiario.toFixed(2)}</td>
                    <td className="py-3 pr-3">
                      <p className="mb-1 text-xs font-semibold text-slate-700">{textoAutonomia(item.autonomiaDias)}</p>
                      <div className="h-1.5 w-28 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${autonomiaBarra}%` }} />
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right text-slate-700">{item.pontoReposicao}</td>
                    <td className="py-3 pr-3 text-right font-extrabold text-royal">{item.sugestaoCompra > 0 ? `${item.sugestaoCompra} un.` : '—'}</td>
                    <td className="py-3 pr-3">
                      <Selo cor={cor} icone={icone}>{item.urgencia}</Selo>
                    </td>
                    <td className="py-3 text-right">
                      <Botao
                        variante="secundario"
                        className="px-3 py-1.5 text-xs"
                        disabled={item.sugestaoCompra === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          aplicarSugestao(item)
                        }}
                      >
                        <PackageCheck size={14} /> Aplicar
                      </Botao>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Cartao>

      {ordemAberta && (
        <Modal titulo="Ordem de reposição" subtitulo={`Calculada para ${diasCobertura} dias de cobertura`} onFechar={() => setOrdemAberta(false)} largura="max-w-xl">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {itensDaOrdem.map((item) => (
              <li key={item.produto.id} className="flex items-center gap-3 p-3 text-sm">
                <IconeCategoria categoria={item.produto.categoria} tamanho="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{item.produto.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {item.sugestaoCompra} un. × {formatarMoeda(item.produto.valorUnitario)}
                  </p>
                </div>
                <span className="font-bold text-slate-900">{formatarMoeda(item.sugestaoCompra * item.produto.valorUnitario)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white">
            <span className="text-sm text-slate-300">Custo estimado</span>
            <span className="text-xl font-extrabold">{formatarMoeda(custoOrdem)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Ao confirmar o recebimento, cada item vira uma ENTRADA no estoque, de uma vez só.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="secundario" onClick={() => setOrdemAberta(false)}>Fechar</Botao>
            <Botao variante="sucesso" onClick={receberOrdemCompleta}>
              <CheckCircle2 size={16} /> Confirmar recebimento
            </Botao>
          </div>
        </Modal>
      )}
    </>
  )
}
