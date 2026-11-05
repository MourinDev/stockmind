import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type {
  DadosFormularioProduto,
  MovimentacaoTela,
  ProdutoTela,
  ResumoGeracao,
  SugestaoApi,
  UsuarioTela,
} from './dominio'

export type AvisoTela = {
  texto: string
  tipo: 'sucesso' | 'erro'
  chave: number
}

export type PedidoMovimentacao = {
  produtoId: number | string
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: number | string
  observacao?: string
  dataOcorrencia?: string
}

export type ResultadoLogin = { ok: true } | { ok: false; erro: string }
export type ResultadoSalvar = { ok: true } | { ok: false; erros: Record<string, string> }
export type ResultadoMovimento = { ok: true; saldos: Record<number, number> } | { ok: false; erro: string }
export type ResultadoBusca = { ok: true; produto: ProdutoTela } | { ok: false; erro?: string }
export type ResultadoSugestoes = { ok: true; sugestoes: SugestaoApi[] } | { ok: false; erro: string }
export type ResultadoGeracao = { ok: true; resumo: ResumoGeracao } | { ok: false; erro: string }
export type ResultadoDecisao = { ok: true; sugestao: SugestaoApi } | { ok: false; erro: string }

export type ValorEstoque = {
  usuario: UsuarioTela | null
  sessaoPronta: boolean
  carregando: boolean
  erroCarga: string
  produtos: ProdutoTela[]
  movimentacoes: MovimentacaoTela[]
  produtosCriticos: ProdutoTela[]
  menuAberto: boolean
  setMenuAberto: Dispatch<SetStateAction<boolean>>
  aviso: AvisoTela | null
  setAviso: Dispatch<SetStateAction<AvisoTela | null>>
  fazerLogin: (email: string, senha: string) => Promise<ResultadoLogin>
  sair: () => Promise<void>
  salvarProduto: (dados: DadosFormularioProduto) => Promise<ResultadoSalvar>
  excluirProduto: (produto: ProdutoTela) => Promise<{ ok: boolean }>
  registrarMovimentacao: (pedido: PedidoMovimentacao) => Promise<ResultadoMovimento>
  registrarMovimentacoes: (pedidos: PedidoMovimentacao[]) => Promise<ResultadoMovimento>
  buscarProdutoPorCodigo: (codigo: string) => Promise<ResultadoBusca>
  listarSugestoes: () => Promise<ResultadoSugestoes>
  gerarSugestoes: () => Promise<ResultadoGeracao>
  decidirSugestao: (id: number, status: 'aceita' | 'ignorada') => Promise<ResultadoDecisao>
  mostrarAviso: (texto: string, tipo?: 'sucesso' | 'erro') => void
  irPara: (id: string) => void
}

export type ProdutoFormulario = DadosFormularioProduto

export type ItemTooltip = {
  dataKey?: string | number
  name?: string | number
  value?: string | number
  color?: string
  payload?: { fill?: string; descricao?: string; classe?: string }
}

export type ConteudoTooltip = {
  active?: boolean
  payload?: ItemTooltip[]
  label?: string | number
  formatarRotulo?: (rotulo: string | number | undefined, itens: ItemTooltip[]) => ReactNode
  formatarValor?: (valor: string | number | undefined, item: ItemTooltip) => ReactNode
}
