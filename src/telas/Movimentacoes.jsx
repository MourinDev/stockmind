/*
  TELA 3: Registro de movimentações (entradas e saídas).
*/
import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, History, Search } from 'lucide-react'
import { COR_ENTRADA, COR_SAIDA, dataISO } from '../dados'
import { estaCritico, formatarData } from '../regras'
import { Abas, Botao, Campo, Cartao, EstadoVazio, IconeCategoria, MensagemErro, TituloTela, classeEntrada } from '../componentes/ui'

const MOTIVOS = {
  ENTRADA: ['Compra do fornecedor', 'Reposição semanal', 'Devolução de cliente', 'Ajuste de inventário'],
  SAIDA: ['Venda', 'Perda', 'Vencimento', 'Ajuste de inventário'],
}

export default function TelaMovimentacoes({ produtos, movimentacoes, registrarMovimentacao }) {
  const formularioVazio = { produtoId: '', tipo: 'ENTRADA', quantidade: '', dataOcorrencia: dataISO(new Date()), observacao: '' }
  const [formulario, setFormulario] = useState(formularioVazio)
  const [erro, setErro] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')

  const produtoSelecionado = produtos.find((p) => p.id === Number(formulario.produtoId))
  const quantidade = Number(formulario.quantidade) || 0
  const entrada = formulario.tipo === 'ENTRADA'

  // Prévia do saldo: mostra o resultado antes de gravar e já avisa se a saída não cabe
  const saldoPrevisto = produtoSelecionado ? produtoSelecionado.quantidade + (entrada ? quantidade : -quantidade) : null
  const saidaInvalida = saldoPrevisto !== null && saldoPrevisto < 0

  const alterar = (campo, valor) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }))
    setErro('')
  }

  function enviar(evento) {
    evento.preventDefault()
    const resultado = registrarMovimentacao(formulario)
    if (resultado.ok) setFormulario({ ...formularioVazio, tipo: formulario.tipo })
    else setErro(resultado.erro)
  }

  const produtoPorId = (id) => produtos.find((p) => p.id === id)
  const historico = movimentacoes
    .filter((m) => !filtroTipo || m.tipo === filtroTipo)
    .filter((m) => {
      const termo = busca.trim().toLowerCase()
      if (!termo) return true
      const produto = produtoPorId(m.produtoId)
      return [produto?.descricao, produto?.codigo, m.observacao, m.usuarioResponsavel].some((texto) => texto?.toLowerCase().includes(termo))
    })
    .sort((a, b) => b.dataOcorrencia.localeCompare(a.dataOcorrencia) || b.id - a.id)

  return (
    <>
      <TituloTela titulo="Movimentações" subtitulo="Entradas (compras, reposições) e saídas (vendas, perdas, vencimentos)" />

      <div className="grid gap-6 xl:grid-cols-5">
        <Cartao titulo="Nova movimentação" className="h-fit xl:col-span-2">
          <form onSubmit={enviar} className="space-y-5" noValidate>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
              {['ENTRADA', 'SAIDA'].map((tipo) => {
                const ativo = formulario.tipo === tipo
                const ehEntrada = tipo === 'ENTRADA'
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => alterar('tipo', tipo)}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                      ativo ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    style={ativo ? { color: ehEntrada ? COR_ENTRADA : COR_SAIDA } : undefined}
                  >
                    {ehEntrada ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                    {ehEntrada ? 'Entrada' : 'Saída'}
                  </button>
                )
              })}
            </div>

            <Campo rotulo="Produto">
              <select value={formulario.produtoId} onChange={(e) => alterar('produtoId', e.target.value)} className={classeEntrada(false)}>
                <option value="">Selecione o produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.descricao}
                  </option>
                ))}
              </select>
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Quantidade">
                <input type="number" min="1" value={formulario.quantidade} onChange={(e) => alterar('quantidade', e.target.value)} className={classeEntrada(saidaInvalida)} placeholder="0" />
              </Campo>
              <Campo rotulo="Data">
                <input type="date" value={formulario.dataOcorrencia} onChange={(e) => alterar('dataOcorrencia', e.target.value)} className={classeEntrada(false)} />
              </Campo>
            </div>

            {produtoSelecionado && (
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${saidaInvalida ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <IconeCategoria categoria={produtoSelecionado.categoria} />
                <div className="flex flex-1 items-center justify-around text-center">
                  <div>
                    <p className="text-xs text-slate-500">Saldo atual</p>
                    <p className={`text-2xl font-extrabold ${estaCritico(produtoSelecionado) ? 'text-red-600' : 'text-slate-900'}`}>{produtoSelecionado.quantidade}</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Depois</p>
                    <p className={`text-2xl font-extrabold ${saidaInvalida ? 'text-red-600' : 'text-slate-900'}`}>{saidaInvalida ? '—' : saldoPrevisto}</p>
                  </div>
                </div>
              </div>
            )}
            {saidaInvalida && <p className="-mt-2 text-xs font-semibold text-red-600">A saída é maior que o saldo disponível.</p>}

            <Campo rotulo="Motivo / observação">
              <input
                value={formulario.observacao}
                onChange={(e) => alterar('observacao', e.target.value)}
                className={classeEntrada(false)}
                placeholder={entrada ? 'Ex.: compra do fornecedor' : 'Ex.: venda, perda, vencimento'}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOTIVOS[formulario.tipo].map((motivo) => (
                  <button
                    key={motivo}
                    type="button"
                    onClick={() => alterar('observacao', motivo)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      formulario.observacao === motivo ? 'border-royal-claro bg-blue-50 text-royal' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {motivo}
                  </button>
                ))}
              </div>
            </Campo>

            <MensagemErro texto={erro} />

            <Botao type="submit" variante={entrada ? 'primario' : 'ia'} className="w-full py-3 text-base">
              Registrar {entrada ? 'entrada' : 'saída'}
            </Botao>
          </form>
        </Cartao>

        <Cartao titulo="Histórico" subtitulo={`${historico.length} registros`} className="xl:col-span-3">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto, motivo ou responsável" className={`${classeEntrada(false)} pl-10`} />
            </div>
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
            <EstadoVazio icone={History} titulo="Nada por aqui" texto="Nenhuma movimentação com esses filtros." />
          ) : (
            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
              {historico.map((m) => {
                const produto = produtoPorId(m.produtoId)
                const ehEntrada = m.tipo === 'ENTRADA'
                const cor = ehEntrada ? COR_ENTRADA : COR_SAIDA
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cor}14`, color: cor }}>
                      {ehEntrada ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{produto?.descricao ?? 'Produto removido'}</p>
                      <p className="truncate text-xs text-slate-500">
                        {m.observacao} · {m.usuarioResponsavel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold" style={{ color: cor }}>
                        {ehEntrada ? '+' : '−'}{m.quantidade}
                      </p>
                      <p className="text-xs text-slate-500">{formatarData(m.dataOcorrencia)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  )
}
