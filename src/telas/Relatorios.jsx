/*
  TELA 6: Relatórios gerenciais e Curva ABC.
*/
import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, History } from 'lucide-react'
import { COR_CLASSE, COR_ENTRADA, COR_SAIDA, dataISO } from '../dados'
import { baixarCSV, calcularCurvaABC, formatarData, formatarMoeda } from '../regras'
import { Abas, Botao, Cartao, EstadoVazio, SeloClasse, TituloTela, TooltipGrafico, animarGraficos, classeEntrada } from '../componentes/ui'

const DESCRICAO_CLASSE = {
  A: 'Poucos itens, maior parte do valor. Controle rigoroso e contagem frequente.',
  B: 'Importância intermediária. Revisão periódica.',
  C: 'Muitos itens, pouco valor. Controle simplificado.',
}

export default function TelaRelatorios({ produtos, movimentacoes }) {
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const curva = useMemo(() => calcularCurvaABC(produtos), [produtos])
  const valorGeral = curva.reduce((s, p) => s + p.valorTotal, 0)

  const resumoClasses = ['A', 'B', 'C'].map((classe) => {
    const itens = curva.filter((p) => p.classe === classe)
    const valor = itens.reduce((s, p) => s + p.valorTotal, 0)
    return { classe, itens: itens.length, valor, percentual: valorGeral ? (valor / valorGeral) * 100 : 0 }
  })

  // Dados do gráfico de Pareto: as duas medidas estão em % (um eixo só, de 0 a 100)
  const dadosPareto = curva.map((p) => ({
    codigo: p.codigo,
    descricao: p.descricao,
    classe: p.classe,
    '% do item': Number(p.percentual.toFixed(1)),
    '% acumulado': Number(p.percentualAcumulado.toFixed(1)),
  }))

  const produtoPorId = (id) => produtos.find((p) => p.id === id)
  const historico = movimentacoes
    .filter((m) => !filtroTipo || m.tipo === filtroTipo)
    .filter((m) => !filtroProduto || m.produtoId === Number(filtroProduto))
    .sort((a, b) => b.dataOcorrencia.localeCompare(a.dataOcorrencia) || b.id - a.id)

  function exportarHistorico() {
    const linhas = [['Data', 'Código', 'Produto', 'Tipo', 'Quantidade', 'Observação', 'Responsável']]
    historico.forEach((m) => {
      const produto = produtoPorId(m.produtoId)
      linhas.push([formatarData(m.dataOcorrencia), produto?.codigo ?? '', produto?.descricao ?? '', m.tipo, m.quantidade, m.observacao, m.usuarioResponsavel])
    })
    baixarCSV(`stockmind-movimentacoes-${dataISO(new Date())}.csv`, linhas)
  }

  function exportarCurva() {
    const decimal = (n) => n.toFixed(2).replace('.', ',')
    const linhas = [['Posição', 'Código', 'Produto', 'Quantidade', 'Valor unitário', 'Valor total', '% do total', '% acumulado', 'Classe']]
    curva.forEach((p, i) => {
      linhas.push([i + 1, p.codigo, p.descricao, p.quantidade, decimal(p.valorUnitario), decimal(p.valorTotal), decimal(p.percentual), decimal(p.percentualAcumulado), p.classe])
    })
    baixarCSV(`stockmind-curva-abc-${dataISO(new Date())}.csv`, linhas)
  }

  return (
    <>
      <TituloTela titulo="Relatórios gerenciais" subtitulo="Curva ABC do estoque e histórico auditável de movimentações">
        <Botao variante="secundario" onClick={exportarCurva}>
          <Download size={16} /> Curva ABC (CSV)
        </Botao>
        <Botao variante="secundario" onClick={exportarHistorico}>
          <Download size={16} /> Movimentações (CSV)
        </Botao>
      </TituloTela>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {resumoClasses.map((r) => (
          <div key={r.classe} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: COR_CLASSE[r.classe] }} />
            <div className="flex items-center justify-between">
              <SeloClasse classe={r.classe} />
              <span className="text-xs font-semibold text-slate-500">{r.itens} {r.itens === 1 ? 'item' : 'itens'}</span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatarMoeda(r.valor)}</p>
            <p className="text-sm font-semibold text-slate-600">{r.percentual.toFixed(1)}% do valor em estoque</p>
            <p className="mt-2 text-xs text-slate-500">{DESCRICAO_CLASSE[r.classe]}</p>
          </div>
        ))}
      </div>

      <Cartao
        titulo="Gráfico de Pareto"
        subtitulo="Participação de cada item (barras) e percentual acumulado (linha)"
        acao={
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            {['A', 'B', 'C'].map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_CLASSE[c] }} /> Classe {c}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-800" /> % acumulado</span>
          </div>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dadosPareto} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="codigo" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 95, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={<TooltipGrafico formatarRotulo={(_, payload) => `${payload[0]?.payload.descricao} · Classe ${payload[0]?.payload.classe}`} formatarValor={(v) => `${v}%`} />}
                cursor={{ fill: '#f1f5f9' }}
              />
              <ReferenceLine y={80} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={95} stroke="#94a3b8" strokeDasharray="4 4" />
              <Bar isAnimationActive={animarGraficos} dataKey="% do item" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {dadosPareto.map((d) => (
                  <Cell key={d.codigo} fill={COR_CLASSE[d.classe]} />
                ))}
              </Bar>
              <Line isAnimationActive={animarGraficos} type="monotone" dataKey="% acumulado" stroke="#1e293b" strokeWidth={2} dot={{ r: 3, fill: '#1e293b', stroke: '#fff', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Cartao>

      <Cartao titulo="Classificação ABC" subtitulo="Valor total = quantidade × valor unitário, do maior para o menor" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-3">#</th>
                <th className="pb-3 pr-3">Produto</th>
                <th className="pb-3 pr-3 text-right">Qtd.</th>
                <th className="pb-3 pr-3 text-right">Valor unit.</th>
                <th className="pb-3 pr-3 text-right">Valor total</th>
                <th className="pb-3 pr-3 text-right">% item</th>
                <th className="pb-3 pr-3">% acumulado</th>
                <th className="pb-3">Classe</th>
              </tr>
            </thead>
            <tbody>
              {curva.map((p, i) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-bold text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-slate-900">{p.descricao}</p>
                    <p className="font-mono text-xs text-slate-500">{p.codigo}</p>
                  </td>
                  <td className="py-3 pr-3 text-right">{p.quantidade}</td>
                  <td className="py-3 pr-3 text-right">{formatarMoeda(p.valorUnitario)}</td>
                  <td className="py-3 pr-3 text-right font-bold text-slate-900">{formatarMoeda(p.valorTotal)}</td>
                  <td className="py-3 pr-3 text-right">{p.percentual.toFixed(1)}%</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, p.percentualAcumulado)}%`, background: COR_CLASSE[p.classe] }} />
                      </div>
                      <span className="text-xs font-semibold">{p.percentualAcumulado.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3"><SeloClasse classe={p.classe} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-slate-900">
                <td colSpan={4} className="pt-4 pr-3 text-right">Total do estoque</td>
                <td className="pt-4 pr-3 text-right">{formatarMoeda(valorGeral)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Cartao>

      <Cartao titulo="Histórico auditável" subtitulo={`${historico.length} registros · quem fez, quando e por quê`} className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} className={`${classeEntrada(false)} sm:w-72`}>
            <option value="">Todos os produtos</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.descricao}</option>
            ))}
          </select>
          <Abas
            valor={filtroTipo}
            onMudar={setFiltroTipo}
            opcoes={[
              { valor: '', rotulo: 'Todas' },
              { valor: 'ENTRADA', rotulo: 'Entradas' },
              { valor: 'SAIDA', rotulo: 'Saídas' },
            ]}
          />
        </div>

        {historico.length === 0 ? (
          <EstadoVazio icone={History} titulo="Nenhum registro" texto="Ajuste os filtros para ver as movimentações." />
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-3">Data</th>
                  <th className="pb-3 pr-3">Produto</th>
                  <th className="pb-3 pr-3">Tipo</th>
                  <th className="pb-3 pr-3 text-right">Qtd.</th>
                  <th className="pb-3 pr-3">Observação</th>
                  <th className="pb-3">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((m) => {
                  const ehEntrada = m.tipo === 'ENTRADA'
                  return (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-slate-600">{formatarData(m.dataOcorrencia)}</td>
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{produtoPorId(m.produtoId)?.descricao ?? 'Produto removido'}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: ehEntrada ? COR_ENTRADA : COR_SAIDA }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: ehEntrada ? COR_ENTRADA : COR_SAIDA }} />
                          {ehEntrada ? 'ENTRADA' : 'SAÍDA'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-bold">{ehEntrada ? '+' : '−'}{m.quantidade}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{m.observacao}</td>
                      <td className="whitespace-nowrap py-2.5 text-slate-600">{m.usuarioResponsavel}</td>
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
