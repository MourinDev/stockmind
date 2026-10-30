/*
  TELA 4: Operação rápida com QR Code.
  O leitor é simulado: tocar numa etiqueta ou digitar o código faz o mesmo
  papel que a câmera/leitor óptico faria ao decodificar o QR Code.
*/
import { useState } from 'react'
import { ArrowDown, ArrowUp, Printer, QrCode, ScanLine } from 'lucide-react'
import { COR_ENTRADA, COR_SAIDA, dataISO } from '../dados'
import { estaCritico, formatarMoeda, tocarBip } from '../regras'
import { Abas, BarraNivel, Botao, Cartao, EstadoVazio, IconeCategoria, MensagemErro, SeloStatus, TituloTela, classeEntrada } from '../componentes/ui'
import { Etiqueta, QRCodeProduto } from '../componentes/QRCode'

function CantoMira({ posicao }) {
  const estilos = {
    'sup-esq': 'left-5 top-5 border-l-4 border-t-4 rounded-tl-2xl',
    'sup-dir': 'right-5 top-5 border-r-4 border-t-4 rounded-tr-2xl',
    'inf-esq': 'bottom-5 left-5 border-b-4 border-l-4 rounded-bl-2xl',
    'inf-dir': 'bottom-5 right-5 border-b-4 border-r-4 rounded-br-2xl',
  }
  return <span className={`absolute h-10 w-10 border-teal-400 ${estilos[posicao]}`} />
}

export default function TelaQRCode({ produtos, registrarMovimentacao }) {
  const [aba, setAba] = useState('leitor')
  const [codigoDigitado, setCodigoDigitado] = useState('')
  const [produtoLidoId, setProdutoLidoId] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [contadorLeituras, setContadorLeituras] = useState(0)
  const [quantidadeLivre, setQuantidadeLivre] = useState('')
  const [erro, setErro] = useState('')
  const [ultimasOperacoes, setUltimasOperacoes] = useState([])

  // Busca pelo id para a ficha refletir o saldo atualizado após cada clique
  const produtoLido = produtos.find((p) => p.id === produtoLidoId)

  function lerCodigo(codigo) {
    const encontrado = produtos.find((p) => p.codigo.toUpperCase() === codigo.trim().toUpperCase())
    setErro('')
    setLendo(true)
    // Pequena espera só para dar a sensação de leitura antes do "bip"
    setTimeout(() => {
      setLendo(false)
      if (encontrado) {
        tocarBip()
        setProdutoLidoId(encontrado.id)
        setContadorLeituras((n) => n + 1)
        setCodigoDigitado('')
      } else {
        setProdutoLidoId(null)
        setErro(`Nenhum produto com o código "${codigo.toUpperCase()}".`)
      }
    }, 500)
  }

  function movimentar(tipo, quantidade) {
    const resultado = registrarMovimentacao({
      produtoId: produtoLido.id,
      tipo,
      quantidade,
      dataOcorrencia: dataISO(new Date()),
      observacao: 'Operação rápida via QR Code',
    })
    setErro(resultado.ok ? '' : resultado.erro)
    if (resultado.ok) {
      setQuantidadeLivre('')
      setUltimasOperacoes((lista) => [{ chave: Date.now(), produto: produtoLido.descricao, tipo, quantidade: Number(quantidade) }, ...lista].slice(0, 5))
    }
  }

  return (
    <>
      <TituloTela titulo="Operação rápida" subtitulo="Leia a etiqueta da prateleira e movimente o estoque com um toque">
        <Abas
          valor={aba}
          onMudar={setAba}
          opcoes={[
            { valor: 'leitor', rotulo: 'Leitor', icone: ScanLine },
            { valor: 'etiquetas', rotulo: 'Etiquetas', icone: Printer },
          ]}
        />
      </TituloTela>

      {aba === 'leitor' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao titulo="Leitor de QR Code" subtitulo="Simulação da câmera do celular">
            <div className="relative mx-auto flex aspect-square max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-slate-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.18),transparent_70%)]" />
              <CantoMira posicao="sup-esq" />
              <CantoMira posicao="sup-dir" />
              <CantoMira posicao="inf-esq" />
              <CantoMira posicao="inf-dir" />

              {produtoLido && !lendo ? (
                <div className="animar-modal relative rounded-2xl bg-white p-3 shadow-2xl">
                  <QRCodeProduto valor={produtoLido.codigo} tamanho={150} />
                </div>
              ) : (
                <div className="relative text-center text-slate-400">
                  <ScanLine size={52} className="mx-auto mb-2 text-teal-400/70" />
                  <p className="text-sm">{lendo ? 'Lendo…' : 'Aponte para uma etiqueta'}</p>
                </div>
              )}

              {(lendo || !produtoLido) && (
                <div className="linha-scanner absolute left-8 right-8 h-0.5 rounded-full bg-teal-400 shadow-[0_0_16px_4px_rgba(45,212,191,0.7)]" />
              )}
              {/* clarão rápido no momento em que o código é lido */}
              {produtoLido && !lendo && <div key={contadorLeituras} className="flash-leitura pointer-events-none absolute inset-0 bg-teal-300" />}
            </div>

            <form
              className="mt-5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (codigoDigitado.trim()) lerCodigo(codigoDigitado)
              }}
            >
              <input
                value={codigoDigitado}
                onChange={(e) => setCodigoDigitado(e.target.value)}
                placeholder="Ou digite o código (ex.: ARZ-001)"
                className={`${classeEntrada(false)} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
              />
              <Botao type="submit">Ler</Botao>
            </form>

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Etiquetas da prateleira · toque para ler</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {produtos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => lerCodigo(p.codigo)}
                  className={`flex flex-col items-center rounded-xl border p-2 transition hover:-translate-y-0.5 hover:shadow-md ${
                    produtoLidoId === p.id ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/30' : 'border-slate-200 bg-white'
                  }`}
                >
                  <QRCodeProduto valor={p.codigo} tamanho={52} />
                  <span className="mt-1 font-mono text-[10px] font-bold text-slate-700">{p.codigo}</span>
                </button>
              ))}
            </div>
          </Cartao>

          <div className="space-y-6">
            <Cartao titulo="Item lido">
              {!produtoLido ? (
                <>
                  <EstadoVazio icone={QrCode} titulo="Nenhum produto lido" texto="Toque numa etiqueta ou digite o código." />
                  <MensagemErro texto={erro} />
                </>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <IconeCategoria categoria={produtoLido.categoria} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-slate-500">{produtoLido.codigo}</p>
                      <p className="text-xl font-extrabold leading-tight text-slate-900">{produtoLido.descricao}</p>
                      <p className="text-sm text-slate-500">
                        {produtoLido.categoria} · {formatarMoeda(produtoLido.valorUnitario)}
                      </p>
                    </div>
                    <SeloStatus critico={estaCritico(produtoLido)} />
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Saldo atual</p>
                        <p key={produtoLido.quantidade} className={`animar-entrada text-4xl font-extrabold ${estaCritico(produtoLido) ? 'text-red-600' : 'text-slate-900'}`}>
                          {produtoLido.quantidade}
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">mínimo {produtoLido.estoqueMinimo}</p>
                    </div>
                    <BarraNivel quantidade={produtoLido.quantidade} minimo={produtoLido.estoqueMinimo} />
                  </div>

                  {['ENTRADA', 'SAIDA'].map((tipo) => {
                    const ehEntrada = tipo === 'ENTRADA'
                    const cor = ehEntrada ? COR_ENTRADA : COR_SAIDA
                    return (
                      <div key={tipo}>
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: cor }}>
                          {ehEntrada ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                          {ehEntrada ? 'Entrada rápida' : 'Saída rápida'}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 5, 10].map((qtd) => (
                            <button
                              key={qtd}
                              onClick={() => movimentar(tipo, qtd)}
                              className="rounded-2xl py-4 text-xl font-extrabold text-white shadow-md transition hover:brightness-110 active:scale-95"
                              style={{ background: cor }}
                            >
                              {ehEntrada ? '+' : '−'}{qtd}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantidadeLivre}
                      onChange={(e) => setQuantidadeLivre(e.target.value)}
                      placeholder="Outra qtd."
                      className={classeEntrada(false)}
                    />
                    <Botao onClick={() => movimentar('ENTRADA', quantidadeLivre)}>Entrada</Botao>
                    <Botao variante="ia" onClick={() => movimentar('SAIDA', quantidadeLivre)}>Saída</Botao>
                  </div>

                  <MensagemErro texto={erro} />
                </div>
              )}
            </Cartao>

            {ultimasOperacoes.length > 0 && (
              <Cartao titulo="Feito nesta sessão">
                <ul className="space-y-2">
                  {ultimasOperacoes.map((op) => (
                    <li key={op.chave} className="animar-entrada flex items-center justify-between text-sm">
                      <span className="truncate text-slate-700">{op.produto}</span>
                      <span className="font-bold" style={{ color: op.tipo === 'ENTRADA' ? COR_ENTRADA : COR_SAIDA }}>
                        {op.tipo === 'ENTRADA' ? '+' : '−'}{op.quantidade}
                      </span>
                    </li>
                  ))}
                </ul>
              </Cartao>
            )}
          </div>
        </div>
      ) : (
        <Cartao
          titulo="Etiquetas para prateleira"
          subtitulo="Cada QR Code guarda o código do produto"
          acao={
            <Botao variante="secundario" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir todas
            </Botao>
          }
        >
          <div className="area-impressao grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {produtos.map((p) => (
              <Etiqueta key={p.id} produto={p} />
            ))}
          </div>
        </Cartao>
      )}
    </>
  )
}
