/*
  Componentes visuais reutilizados em todas as telas.
*/
import { AlertTriangle, BrainCircuit, CheckCircle2, CupSoda, Milk, ShoppingBasket, ShowerHead, SprayCan, X, XCircle } from 'lucide-react'
import { COR_CATEGORIA, COR_CLASSE } from '../dados'

export function LogoStockMind({ escuro = false, compacto = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-royal via-royal-claro to-teal-marca text-white shadow-lg shadow-blue-900/30">
        <BrainCircuit size={22} />
      </div>
      <div className="leading-tight">
        <p className="text-xl font-extrabold tracking-tight">
          <span className={escuro ? 'text-white' : 'text-chumbo'}>STOCK</span>
          <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">MIND</span>
        </p>
        {!compacto && (
          <p className={`text-[8.5px] font-semibold uppercase tracking-wider ${escuro ? 'text-slate-400' : 'text-slate-500'}`}>
            Controle inteligente de estoque
          </p>
        )}
      </div>
    </div>
  )
}

export function Cartao({ titulo, subtitulo, acao, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {(titulo || acao) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {titulo && <h2 className="font-bold text-slate-900">{titulo}</h2>}
            {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </section>
  )
}

export function TituloTela({ titulo, subtitulo, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Botao({ variante = 'primario', className = '', children, ...props }) {
  const estilos = {
    primario: 'bg-gradient-to-r from-royal to-royal-claro text-white shadow-md shadow-blue-900/20 hover:brightness-110',
    secundario: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    sucesso: 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-700',
    perigo: 'bg-red-600 text-white shadow-md shadow-red-900/20 hover:bg-red-700',
    ia: 'bg-gradient-to-r from-royal via-royal-claro to-teal-marca text-white shadow-md shadow-teal-900/20 hover:brightness-110',
    fantasma: 'text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Campo({ rotulo, erro, ajuda, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{rotulo}</span>
      {children}
      {erro ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
          <AlertTriangle size={12} /> {erro}
        </span>
      ) : (
        ajuda && <span className="mt-1 block text-xs text-slate-400">{ajuda}</span>
      )}
    </label>
  )
}

export const classeEntrada = (temErro) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4 ${
    temErro ? 'border-red-400 bg-red-50 focus:ring-red-100' : 'border-slate-200 bg-slate-50 focus:border-royal-claro focus:bg-white focus:ring-blue-100'
  }`

export function Selo({ cor, icone: Icone, children }) {
  const cores = {
    verde: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    vermelho: 'bg-red-50 text-red-700 ring-red-600/20',
    amarelo: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    azul: 'bg-blue-50 text-blue-800 ring-blue-600/20',
    cinza: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cores[cor]}`}>
      {Icone && <Icone size={12} />}
      {children}
    </span>
  )
}

export function SeloTipo({ tipo }) {
  return tipo === 'ENTRADA' ? <Selo cor="azul">Entrada</Selo> : <Selo cor="cinza">Saída</Selo>
}

export function SeloClasse({ classe }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_CLASSE[classe] }} />
      Classe {classe}
    </span>
  )
}

export function SeloStatus({ critico }) {
  return critico ? (
    <Selo cor="vermelho" icone={AlertTriangle}>Crítico</Selo>
  ) : (
    <Selo cor="verde" icone={CheckCircle2}>Normal</Selo>
  )
}

const ICONE_CATEGORIA = {
  Mercearia: ShoppingBasket,
  Laticínios: Milk,
  Bebidas: CupSoda,
  Limpeza: SprayCan,
  Higiene: ShowerHead,
}

export function IconeCategoria({ categoria, tamanho = 'md' }) {
  const Icone = ICONE_CATEGORIA[categoria] ?? ShoppingBasket
  const cor = COR_CATEGORIA[categoria] ?? '#64748b'
  const medidas = tamanho === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div className={`flex ${medidas} shrink-0 items-center justify-center rounded-xl`} style={{ background: `${cor}14`, color: cor }}>
      <Icone size={tamanho === 'sm' ? 16 : 18} />
    </div>
  )
}

// Barra que mostra o saldo em relação ao estoque mínimo.
// A escala vai até 2x o mínimo; o tracinho marca onde o mínimo fica.
export function BarraNivel({ quantidade, minimo, largura = 'w-full' }) {
  const limite = Math.max(minimo * 2, 1)
  const percentual = Math.min(100, (quantidade / limite) * 100)
  const critico = quantidade <= minimo
  const atencao = !critico && quantidade <= minimo * 1.3
  const cor = critico ? 'bg-red-500' : atencao ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className={`relative h-2 rounded-full bg-slate-100 ${largura}`} title={`${quantidade} de mínimo ${minimo}`}>
      <div className={`h-2 rounded-full ${cor} transition-all duration-500`} style={{ width: `${percentual}%` }} />
      <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-400" style={{ left: '50%' }} />
    </div>
  )
}

export function Modal({ titulo, subtitulo, onFechar, children, largura = 'max-w-lg' }) {
  return (
    <div className="animar-fundo fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFechar}>
      <div
        className={`animar-modal max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${largura}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{titulo}</h3>
            {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Aviso({ aviso, onFechar }) {
  const erro = aviso.tipo === 'erro'
  return (
    <div className="animar-aviso fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:w-96">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-2xl">
        <div className={`rounded-full p-1 ${erro ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {erro ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{erro ? 'Operação bloqueada' : 'Tudo certo'}</p>
          <p className="text-slate-600">{aviso.texto}</p>
        </div>
        <button onClick={onFechar} className="text-slate-400 hover:text-slate-700" aria-label="Fechar aviso">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export function MensagemErro({ texto }) {
  if (!texto) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
      <AlertTriangle size={18} className="shrink-0" />
      <span>{texto}</span>
    </div>
  )
}

export function EstadoVazio({ icone: Icone, titulo, texto }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icone size={26} />
      </div>
      <p className="font-semibold text-slate-700">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-slate-500">{texto}</p>}
    </div>
  )
}

// Abas em formato de "pílula", usadas nos filtros
export function Abas({ opcoes, valor, onMudar }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          onClick={() => onMudar(opcao.valor)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            valor === opcao.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opcao.icone && <opcao.icone size={15} />}
          {opcao.rotulo}
        </button>
      ))}
    </div>
  )
}

// Quem pediu ao sistema operacional para reduzir animações vê os gráficos já prontos
export const animarGraficos = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Caixinha do tooltip dos gráficos (recharts)
export function TooltipGrafico({ active, payload, label, formatarRotulo, formatarValor = (v) => v }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-slate-900">{formatarRotulo ? formatarRotulo(label, payload) : label}</p>
      {payload.map((item) => (
        <p key={item.dataKey ?? item.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color ?? item.payload?.fill }} />
          {item.name}: <strong className="text-slate-900">{formatarValor(item.value, item)}</strong>
        </p>
      ))}
    </div>
  )
}
