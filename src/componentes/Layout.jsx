/*
  Estrutura fixa do sistema: menu lateral (gaveta no celular) e cabeçalho.
*/
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Bell, FileBarChart, LayoutDashboard, LogOut, Menu, Package, QrCode, Sparkles, X } from 'lucide-react'
import { LogoStockMind, IconeCategoria } from './ui'

export const GRUPOS_MENU = [
  {
    titulo: 'Visão geral',
    itens: [{ id: 'dashboard', rotulo: 'Dashboard', icone: LayoutDashboard }],
  },
  {
    titulo: 'Operação',
    itens: [
      { id: 'produtos', rotulo: 'Produtos', icone: Package },
      { id: 'movimentacoes', rotulo: 'Movimentações', icone: ArrowLeftRight },
      { id: 'qrcode', rotulo: 'Operação QR Code', icone: QrCode },
    ],
  },
  {
    titulo: 'Inteligência',
    itens: [
      { id: 'ia', rotulo: 'StockMind IA', icone: Sparkles, destaque: true },
      { id: 'relatorios', rotulo: 'Relatórios e Curva ABC', icone: FileBarChart },
    ],
  },
]

export const TITULO_TELA = Object.fromEntries(GRUPOS_MENU.flatMap((g) => g.itens).map((i) => [i.id, i.rotulo]))

export function BarraLateral({ telaAtual, totalAlertas, usuario, aberto, onFechar, onNavegar, onSair }) {
  return (
    <>
      {aberto && <div className="animar-fundo fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onFechar} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* brilho decorativo com as cores da marca */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-royal/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-teal-marca/25 blur-3xl" />
        </div>

        <div className="relative flex items-center justify-between px-5 py-5">
          <LogoStockMind escuro />
          <button onClick={onFechar} className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-2">
          {GRUPOS_MENU.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">{grupo.titulo}</p>
              <div className="space-y-1">
                {grupo.itens.map(({ id, rotulo, icone: Icone, destaque }) => {
                  const ativo = telaAtual === id
                  return (
                    <button
                      key={id}
                      onClick={() => onNavegar(id)}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        ativo ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {ativo && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-blue-400 to-teal-400" />}
                      <Icone size={18} className={ativo ? 'text-teal-300' : 'text-slate-500 group-hover:text-slate-300'} />
                      <span className="flex-1 text-left">{rotulo}</span>
                      {id === 'dashboard' && totalAlertas > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{totalAlertas}</span>
                      )}
                      {destaque && (
                        <span className="rounded-full bg-gradient-to-r from-blue-500 to-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">IA</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative m-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <Avatar nome={usuario.nome} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{usuario.nome}</p>
            <p className="text-xs text-slate-400">{usuario.cargo}</p>
          </div>
          <button onClick={onSair} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  )
}

export function Avatar({ nome, tamanho = 'h-9 w-9 text-sm' }) {
  const iniciais = nome
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
  return (
    <div className={`flex ${tamanho} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-royal-claro to-teal-marca font-bold text-white`}>
      {iniciais}
    </div>
  )
}

export function Cabecalho({ telaAtual, usuario, produtosCriticos, onAbrirMenu, onNavegar, onSair }) {
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false)
  const caixaRef = useRef(null)

  // Fecha a caixa de notificações ao clicar fora dela
  useEffect(() => {
    function aoClicar(evento) {
      if (caixaRef.current && !caixaRef.current.contains(evento.target)) setNotificacoesAbertas(false)
    }
    document.addEventListener('mousedown', aoClicar)
    return () => document.removeEventListener('mousedown', aoClicar)
  }, [])

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <button onClick={onAbrirMenu} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <div className="min-w-0">
        <p className="hidden text-xs capitalize text-slate-400 sm:block">{hoje}</p>
        <p className="truncate font-bold text-slate-900">{TITULO_TELA[telaAtual]}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={caixaRef}>
          <button
            onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
            className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100"
            aria-label="Alertas de estoque"
          >
            <Bell size={20} />
            {produtosCriticos.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {produtosCriticos.length}
              </span>
            )}
          </button>

          {notificacoesAbertas && (
            <div className="animar-modal absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="font-bold text-slate-900">Alertas de estoque</p>
                <span className="text-xs text-slate-500">{produtosCriticos.length} itens</span>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {produtosCriticos.length === 0 && <li className="p-4 text-sm text-slate-500">Nenhum alerta no momento.</li>}
                {produtosCriticos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3">
                    <IconeCategoria categoria={p.categoria} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.descricao}</p>
                      <p className="text-xs text-slate-500">
                        Saldo {p.quantidade} · mínimo {p.estoqueMinimo}
                      </p>
                    </div>
                    <AlertTriangle size={16} className="text-red-500" />
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setNotificacoesAbertas(false)
                  onNavegar('ia')
                }}
                className="w-full bg-slate-50 px-4 py-3 text-sm font-semibold text-royal-claro hover:bg-slate-100"
              >
                Ver sugestão de reposição da IA
              </button>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{usuario.nome}</p>
            <p className="text-xs text-slate-500">{usuario.cargo}</p>
          </div>
          <Avatar nome={usuario.nome} />
        </div>
        <button onClick={onSair} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 sm:hidden" aria-label="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}
