/*
  TELA 1: Dashboard gerencial (Business Intelligence).
*/
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Boxes, BrainCircuit, CheckCircle2, Plus, Wallet } from 'lucide-react'
import { CATEGORIAS, COR_CATEGORIA, COR_ENTRADA, COR_SAIDA, JANELA_ANALISE_DIAS, diasAtras } from '../dados'
import { calcularSugestaoIA, formatarData, formatarMoeda, saudacao } from '../regras'
import { BarraNivel, Botao, Cartao, EstadoVazio, IconeCategoria, TooltipGrafico, animarGraficos } from '../componentes/ui'

function CartaoKPI({ titulo, valor, detalhe, icone: Icone, cor, variacao }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{titulo}</p>
        <div className="rounded-xl p-2.5" style={{ background: `${cor}14`, color: cor }}>
          <Icone size={20} />
        </div>
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{valor}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {variacao !== undefined && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${variacao >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {variacao >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
            {Math.abs(variacao).toFixed(0)}%
          </span>
        )}
        <span className="text-slate-500">{detalhe}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: cor, opacity: 0.7 }} />
    </div>
  )
}

export default function TelaDashboard({ produtos, movimentacoes, usuario, produtosCriticos, irPara }) {
  const valorImobilizado = produtos.reduce((soma, p) => soma + p.quantidade * p.valorUnitario, 0)
  const movimentacoesPeriodo = movimentacoes.filter((m) => m.dataOcorrencia >= diasAtras(JANELA_ANALISE_DIAS))

  // Variação de movimentações: últimos 7 dias contra os 7 anteriores
  const ultimaSemana = movimentacoes.filter((m) => m.dataOcorrencia > diasAtras(7)).length
  const semanaAnterior = movimentacoes.filter((m) => m.dataOcorrencia > diasAtras(14) && m.dataOcorrencia <= diasAtras(7)).length
  const variacaoSemanal = semanaAnterior > 0 ? ((ultimaSemana - semanaAnterior) / semanaAnterior) * 100 : undefined

  // Fluxo diário: soma das entradas e das saídas de cada um dos últimos 15 dias
  const fluxoDiario = useMemo(() => {
    const dias = []
    for (let i = JANELA_ANALISE_DIAS - 1; i >= 0; i--) {
      const data = diasAtras(i)
      const doDia = movimentacoes.filter((m) => m.dataOcorrencia === data)
      dias.push({
        data,
        Entradas: doDia.filter((m) => m.tipo === 'ENTRADA').reduce((s, m) => s + m.quantidade, 0),
        Saídas: doDia.filter((m) => m.tipo === 'SAIDA').reduce((s, m) => s + m.quantidade, 0),
      })
    }
    return dias
  }, [movimentacoes])

  const valorPorCategoria = CATEGORIAS.map((categoria) => ({
    categoria,
    valor: produtos.filter((p) => p.categoria === categoria).reduce((s, p) => s + p.quantidade * p.valorUnitario, 0),
  })).filter((c) => c.valor > 0)

  // Produtos com mais saídas no período (os que mais giram)
  const maisVendidos = produtos
    .map((p) => ({
      produto: p,
      saidas: movimentacoesPeriodo.filter((m) => m.produtoId === p.id && m.tipo === 'SAIDA').reduce((s, m) => s + m.quantidade, 0),
    }))
    .filter((item) => item.saidas > 0)
    .sort((a, b) => b.saidas - a.saidas)
    .slice(0, 5)
  const maiorSaida = maisVendidos[0]?.saidas ?? 1

  // Resumo da IA para o banner do topo
  const urgentes = produtos.map((p) => ({ p, ...calcularSugestaoIA(p, movimentacoes, 15) })).filter((i) => i.urgencia === 'Reposição Imediata')
  const custoUrgentes = urgentes.reduce((s, i) => s + i.sugestaoCompra * i.p.valorUnitario, 0)

  const recentes = [...movimentacoes].sort((a, b) => b.dataOcorrencia.localeCompare(a.dataOcorrencia) || b.id - a.id).slice(0, 6)
  const produtoPorId = (id) => produtos.find((p) => p.id === id)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{saudacao()},</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{usuario.nome.split(' ')[0]}</h1>
        </div>
        <Botao onClick={() => irPara('movimentacoes')}>
          <Plus size={18} /> Nova movimentação
        </Botao>
      </div>

      {/* Banner da IA */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full bg-royal/70 blur-3xl" />
          <div className="absolute -bottom-24 right-40 h-60 w-60 rounded-full bg-teal-marca/50 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <BrainCircuit size={26} className="text-teal-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-300">StockMind IA</p>
              {urgentes.length > 0 ? (
                <p className="mt-1 text-lg font-bold leading-snug sm:text-xl">
                  {urgentes.length} {urgentes.length === 1 ? 'produto pode faltar' : 'produtos podem faltar'} antes da próxima entrega.
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold sm:text-xl">Nenhum produto com risco imediato de ruptura.</p>
              )}
              <p className="mt-1 text-sm text-slate-300">
                {urgentes.length > 0
                  ? `Reposição sugerida para 15 dias: ${formatarMoeda(custoUrgentes)} (${urgentes.map((i) => i.p.descricao.split(' ')[0]).join(', ')}).`
                  : 'O giro atual está coberto pelo estoque disponível.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => irPara('ia')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
          >
            Ver sugestões <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKPI titulo="Produtos (SKUs)" valor={produtos.length} detalhe={`${CATEGORIAS.length} categorias`} icone={Boxes} cor="#1D4ED8" />
        <CartaoKPI titulo="Valor em estoque" valor={formatarMoeda(valorImobilizado)} detalhe="capital imobilizado" icone={Wallet} cor="#0D9488" />
        <CartaoKPI
          titulo="Estoque crítico"
          valor={produtosCriticos.length}
          detalhe={produtosCriticos.length ? 'itens no mínimo ou abaixo' : 'tudo acima do mínimo'}
          icone={AlertTriangle}
          cor={produtosCriticos.length ? '#DC2626' : '#059669'}
        />
        <CartaoKPI
          titulo="Movimentações"
          valor={movimentacoesPeriodo.length}
          detalhe="7 dias vs. 7 anteriores"
          icone={ArrowLeftRight}
          cor="#7C3AED"
          variacao={variacaoSemanal}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Cartao
          titulo="Fluxo de entradas e saídas"
          subtitulo={`Unidades movimentadas por dia, últimos ${JANELA_ANALISE_DIAS} dias`}
          className="xl:col-span-2"
          acao={
            <div className="flex gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_ENTRADA }} /> Entradas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_SAIDA }} /> Saídas</span>
            </div>
          }
        >
          <div className="h-64 xl:h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxoDiario} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="data" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipGrafico formatarRotulo={formatarData} formatarValor={(v) => `${v} un.`} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar isAnimationActive={animarGraficos} dataKey="Entradas" fill={COR_ENTRADA} radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar isAnimationActive={animarGraficos} dataKey="Saídas" fill={COR_SAIDA} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Cartao>

        <Cartao titulo="Valor por categoria" subtitulo="Onde está o dinheiro parado">
          <div className="relative mx-auto h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie isAnimationActive={animarGraficos} data={valorPorCategoria} dataKey="valor" nameKey="categoria" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {valorPorCategoria.map((c) => (
                    <Cell key={c.categoria} fill={COR_CATEGORIA[c.categoria]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipGrafico formatarRotulo={(_, payload) => payload[0]?.name} formatarValor={(v) => formatarMoeda(v)} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-base font-extrabold text-slate-900">{formatarMoeda(valorImobilizado)}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {[...valorPorCategoria].sort((a, b) => b.valor - a.valor).map((c) => (
              <li key={c.categoria} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_CATEGORIA[c.categoria] }} />
                <span className="flex-1 text-slate-700">{c.categoria}</span>
                <span className="font-semibold text-slate-900">{formatarMoeda(c.valor)}</span>
                <span className="w-12 text-right text-xs text-slate-500">{((c.valor / valorImobilizado) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Cartao
          titulo="Alertas de ruptura"
          subtitulo="Saldo comparado ao estoque mínimo"
          acao={
            produtosCriticos.length > 0 && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{produtosCriticos.length} itens</span>
            )
          }
        >
          {produtosCriticos.length === 0 ? (
            <EstadoVazio icone={CheckCircle2} titulo="Tudo em dia" texto="Nenhum produto abaixo do estoque mínimo." />
          ) : (
            <ul className="space-y-4">
              {produtosCriticos.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <IconeCategoria categoria={p.categoria} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.descricao}</p>
                      <p className="shrink-0 text-xs text-slate-500">
                        <strong className="text-base text-red-600">{p.quantidade}</strong> / {p.estoqueMinimo}
                      </p>
                    </div>
                    <BarraNivel quantidade={p.quantidade} minimo={p.estoqueMinimo} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Mais vendidos" subtitulo={`Unidades que saíram nos últimos ${JANELA_ANALISE_DIAS} dias`}>
          <ul className="space-y-4">
            {maisVendidos.map(({ produto, saidas }, posicao) => (
              <li key={produto.id} className="flex items-center gap-3">
                <span className="w-5 text-center text-sm font-bold text-slate-400">{posicao + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-slate-800">{produto.descricao}</span>
                    <span className="shrink-0 font-bold text-slate-900">{saidas} un.</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full" style={{ width: `${(saidas / maiorSaida) * 100}%`, background: COR_SAIDA }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao
          titulo="Atividade recente"
          className="lg:col-span-2 xl:col-span-1"
          acao={
            <button onClick={() => irPara('movimentacoes')} className="text-sm font-semibold text-royal-claro hover:underline">
              Ver tudo
            </button>
          }
        >
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {recentes.map((m) => {
              const produto = produtoPorId(m.produtoId)
              const entrada = m.tipo === 'ENTRADA'
              return (
                <li key={m.id} className="relative">
                  <span
                    className="absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white"
                    style={{ background: entrada ? COR_ENTRADA : COR_SAIDA }}
                  />
                  <p className="text-sm text-slate-800">
                    <strong>{entrada ? 'Entrada' : 'Saída'}</strong> de {m.quantidade} un. · {produto?.descricao ?? 'Produto removido'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatarData(m.dataOcorrencia)} · {m.usuarioResponsavel}
                  </p>
                </li>
              )
            })}
          </ol>
        </Cartao>
      </div>
    </>
  )
}
