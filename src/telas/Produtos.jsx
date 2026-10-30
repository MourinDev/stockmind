/*
  TELA 2: Cadastro e gestão de produtos (CRUD + validações).
*/
import { useState } from 'react'
import { ArrowDownUp, PackageSearch, Pencil, Plus, Printer, QrCode, Search, Trash2 } from 'lucide-react'
import { CATEGORIAS } from '../dados'
import { estaCritico, formatarMoeda, nivelEstoque } from '../regras'
import { Abas, BarraNivel, Botao, Campo, Cartao, EstadoVazio, IconeCategoria, MensagemErro, Modal, SeloStatus, TituloTela, classeEntrada } from '../componentes/ui'
import { Etiqueta } from '../componentes/QRCode'

const PRODUTO_VAZIO = { codigo: '', descricao: '', categoria: '', quantidade: '', estoqueMinimo: '', valorUnitario: '' }

const ORDENACOES = {
  descricao: { rotulo: 'Nome (A-Z)', comparar: (a, b) => a.descricao.localeCompare(b.descricao) },
  nivel: { rotulo: 'Mais críticos primeiro', comparar: (a, b) => nivelEstoque(a) - nivelEstoque(b) },
  valor: { rotulo: 'Maior valor em estoque', comparar: (a, b) => b.quantidade * b.valorUnitario - a.quantidade * a.valorUnitario },
  codigo: { rotulo: 'Código', comparar: (a, b) => a.codigo.localeCompare(b.codigo) },
}

export default function TelaProdutos({ produtos, onSalvar, onExcluir }) {
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [ordenacao, setOrdenacao] = useState('descricao')
  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null)
  const [produtoEtiqueta, setProdutoEtiqueta] = useState(null)
  const [produtoExcluir, setProdutoExcluir] = useState(null)

  const totalCriticos = produtos.filter(estaCritico).length

  const produtosFiltrados = produtos
    .filter((p) => {
      const termo = busca.trim().toLowerCase()
      const bateBusca = !termo || p.descricao.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo)
      const bateCategoria = !filtroCategoria || p.categoria === filtroCategoria
      const bateStatus = filtroStatus === 'todos' || (filtroStatus === 'critico' ? estaCritico(p) : !estaCritico(p))
      return bateBusca && bateCategoria && bateStatus
    })
    .sort(ORDENACOES[ordenacao].comparar)

  // Ações de cada produto, usadas tanto na tabela quanto nos cartões do celular
  const acoes = (p) => (
    <div className="flex justify-end gap-1">
      <button onClick={() => setProdutoEtiqueta(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Etiqueta QR Code">
        <QrCode size={17} />
      </button>
      <button onClick={() => setProdutoEmEdicao(p)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-royal-claro" title="Editar">
        <Pencil size={17} />
      </button>
      <button onClick={() => setProdutoExcluir(p)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Excluir">
        <Trash2 size={17} />
      </button>
    </div>
  )

  return (
    <>
      <TituloTela titulo="Produtos" subtitulo={`${produtos.length} itens cadastrados · ${totalCriticos} em estoque crítico`}>
        <Botao onClick={() => setProdutoEmEdicao(PRODUTO_VAZIO)}>
          <Plus size={18} /> Novo produto
        </Botao>
      </TituloTela>

      <Cartao>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código (SKU)"
              className={`${classeEntrada(false)} pl-10`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={`${classeEntrada(false)} lg:w-48`}>
              <option value="">Todas as categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="relative">
              <ArrowDownUp size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} className={`${classeEntrada(false)} pl-8 lg:w-56`}>
                {Object.entries(ORDENACOES).map(([chave, { rotulo }]) => (
                  <option key={chave} value={chave}>{rotulo}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto">
          <Abas
            valor={filtroStatus}
            onMudar={setFiltroStatus}
            opcoes={[
              { valor: 'todos', rotulo: `Todos (${produtos.length})` },
              { valor: 'normal', rotulo: `Normal (${produtos.length - totalCriticos})` },
              { valor: 'critico', rotulo: `Crítico (${totalCriticos})` },
            ]}
          />
        </div>

        {produtosFiltrados.length === 0 ? (
          <EstadoVazio icone={PackageSearch} titulo="Nenhum produto encontrado" texto="Tente outro termo ou limpe os filtros." />
        ) : (
          <>
            {/* Computador: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-3">Produto</th>
                    <th className="pb-3 pr-3">Categoria</th>
                    <th className="pb-3 pr-3">Nível de estoque</th>
                    <th className="pb-3 pr-3 text-right">Valor unit.</th>
                    <th className="pb-3 pr-3 text-right">Total</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <IconeCategoria categoria={p.categoria} />
                          <div>
                            <p className="font-semibold text-slate-900">{p.descricao}</p>
                            <p className="font-mono text-xs text-slate-500">{p.codigo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{p.categoria}</td>
                      <td className="py-3 pr-3">
                        <div className="w-40">
                          <p className="mb-1 text-xs text-slate-500">
                            <strong className={`text-sm ${estaCritico(p) ? 'text-red-600' : 'text-slate-900'}`}>{p.quantidade}</strong> un. · mín. {p.estoqueMinimo}
                          </p>
                          <BarraNivel quantidade={p.quantidade} minimo={p.estoqueMinimo} />
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right text-slate-700">{formatarMoeda(p.valorUnitario)}</td>
                      <td className="py-3 pr-3 text-right font-semibold text-slate-900">{formatarMoeda(p.quantidade * p.valorUnitario)}</td>
                      <td className="py-3 pr-3"><SeloStatus critico={estaCritico(p)} /></td>
                      <td className="py-3">{acoes(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular: cartões */}
            <ul className="space-y-3 md:hidden">
              {produtosFiltrados.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <IconeCategoria categoria={p.categoria} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{p.descricao}</p>
                      <p className="font-mono text-xs text-slate-500">{p.codigo} · {p.categoria}</p>
                    </div>
                    <SeloStatus critico={estaCritico(p)} />
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-slate-500">
                      <strong className={`text-sm ${estaCritico(p) ? 'text-red-600' : 'text-slate-900'}`}>{p.quantidade}</strong> un. · mínimo {p.estoqueMinimo}
                    </p>
                    <BarraNivel quantidade={p.quantidade} minimo={p.estoqueMinimo} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                    <p className="text-sm">
                      <span className="font-bold text-slate-900">{formatarMoeda(p.valorUnitario)}</span>
                      <span className="text-slate-500"> / un.</span>
                    </p>
                    {acoes(p)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Cartao>

      {produtoEmEdicao && <ModalProduto produtoInicial={produtoEmEdicao} onSalvar={onSalvar} onFechar={() => setProdutoEmEdicao(null)} />}

      {produtoEtiqueta && (
        <Modal titulo="Etiqueta QR Code" subtitulo="Cole na prateleira para ler com o celular" onFechar={() => setProdutoEtiqueta(null)} largura="max-w-xs">
          <div className="area-impressao">
            <Etiqueta produto={produtoEtiqueta} />
          </div>
          <Botao variante="secundario" className="mt-4 w-full" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir etiqueta
          </Botao>
        </Modal>
      )}

      {produtoExcluir && (
        <Modal titulo="Excluir produto?" onFechar={() => setProdutoExcluir(null)} largura="max-w-sm">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{produtoExcluir.descricao}</strong> ({produtoExcluir.codigo}) será removido do cadastro. Produtos com
            movimentações registradas não podem ser excluídos.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="secundario" onClick={() => setProdutoExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                onExcluir(produtoExcluir)
                setProdutoExcluir(null)
              }}
            >
              <Trash2 size={16} /> Excluir
            </Botao>
          </div>
        </Modal>
      )}
    </>
  )
}

function ModalProduto({ produtoInicial, onSalvar, onFechar }) {
  const [dados, setDados] = useState({ ...produtoInicial })
  const [erros, setErros] = useState({})
  const editando = Boolean(produtoInicial.id)

  const alterar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value })

  function enviar(evento) {
    evento.preventDefault()
    const resultado = onSalvar(dados)
    if (resultado.ok) onFechar()
    else setErros(resultado.erros)
  }

  const totalErros = Object.keys(erros).length

  return (
    <Modal
      titulo={editando ? 'Editar produto' : 'Novo produto'}
      subtitulo={editando ? `${produtoInicial.codigo} · ${produtoInicial.descricao}` : 'Preencha os dados do item'}
      onFechar={onFechar}
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {totalErros > 0 && <MensagemErro texto={`Corrija ${totalErros === 1 ? 'o campo destacado' : `os ${totalErros} campos destacados`} antes de salvar.`} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Código (SKU)" erro={erros.codigo} ajuda="É o que vai no QR Code">
            <input value={dados.codigo} onChange={alterar('codigo')} className={`${classeEntrada(erros.codigo)} font-mono uppercase`} placeholder="ARZ-001" />
          </Campo>
          <Campo rotulo="Categoria" erro={erros.categoria}>
            <select value={dados.categoria} onChange={alterar('categoria')} className={classeEntrada(erros.categoria)}>
              <option value="">Selecione</option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo rotulo="Descrição" erro={erros.descricao}>
          <input value={dados.descricao} onChange={alterar('descricao')} className={classeEntrada(erros.descricao)} placeholder="Ex.: Arroz Tipo 1 5kg" />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo={editando ? 'Quantidade' : 'Qtd. inicial'} erro={erros.quantidade}>
            <input type="number" value={dados.quantidade} onChange={alterar('quantidade')} className={classeEntrada(erros.quantidade)} />
          </Campo>
          <Campo rotulo="Estoque mínimo" erro={erros.estoqueMinimo} ajuda="Dispara o alerta">
            <input type="number" value={dados.estoqueMinimo} onChange={alterar('estoqueMinimo')} className={classeEntrada(erros.estoqueMinimo)} />
          </Campo>
          <Campo rotulo="Valor unitário" erro={erros.valorUnitario}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <input type="number" step="0.01" value={dados.valorUnitario} onChange={alterar('valorUnitario')} className={`${classeEntrada(erros.valorUnitario)} pl-9`} />
            </div>
          </Campo>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Botao type="button" variante="secundario" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">{editando ? 'Salvar alterações' : 'Cadastrar produto'}</Botao>
        </div>
      </form>
    </Modal>
  )
}
