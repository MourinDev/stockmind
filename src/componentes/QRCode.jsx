import { useMemo } from 'react'
import qrcode from 'qrcode-generator'
import { formatarMoeda } from '../regras'

// Gera o QR Code em SVG a partir do código do produto (é o que o leitor lê)
export function QRCodeProduto({ valor, tamanho = 120 }) {
  const caminho = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(valor)
    qr.make()
    const total = qr.getModuleCount()
    let d = ''
    for (let linha = 0; linha < total; linha++) {
      for (let coluna = 0; coluna < total; coluna++) {
        if (qr.isDark(linha, coluna)) d += `M${coluna},${linha}h1v1h-1z`
      }
    }
    return { d, total }
  }, [valor])

  return (
    <svg width={tamanho} height={tamanho} viewBox={`-2 -2 ${caminho.total + 4} ${caminho.total + 4}`} shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={caminho.total + 4} height={caminho.total + 4} fill="#fff" />
      <path d={caminho.d} fill="#0f172a" />
    </svg>
  )
}

export function Etiqueta({ produto }) {
  return (
    <div className="etiqueta flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="mb-2 flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
        <span>StockMind</span>
        <span>{produto.categoria}</span>
      </div>
      <QRCodeProduto valor={produto.codigo} tamanho={110} />
      <p className="mt-2 font-mono text-sm font-bold text-slate-900">{produto.codigo}</p>
      <p className="line-clamp-1 text-xs text-slate-600">{produto.descricao}</p>
      <p className="mt-1 text-base font-extrabold text-royal">{formatarMoeda(produto.valorUnitario)}</p>
    </div>
  )
}
