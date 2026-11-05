export type Perfil = 'admin' | 'operador'
export type StatusSugestao = 'pendente' | 'aceita' | 'ignorada'
export type TipoMovimentacaoTela = 'ENTRADA' | 'SAIDA'
export type Urgencia = 'Reposição Imediata' | 'Planejar Compra' | 'Estoque Saudável'
export type ClasseAbc = 'A' | 'B' | 'C'

export type ClaimsSessao = {
  id: number
  perfil: Perfil
  nome: string
}

export type Sessao = {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export type UsuarioTela = Sessao & {
  cargo: 'Gestor' | 'Operador'
}

export type Categoria = {
  id: number
  nome: string
  cor: string
}

export type ProdutoApi = {
  id: number
  codigo: string
  descricao: string
  categoria: string | null
  categoriaId: number
  quantidadeAtual: number
  estoqueMinimo: number
  valorCusto: number
  valorVenda: number
  qrCode: string
  ativo: boolean
}

export type ProdutoTela = {
  id: number
  codigo: string
  descricao: string
  categoria: string
  quantidade: number
  estoqueMinimo: number
  valorUnitario: number
}

export type MovimentacaoApi = {
  id: number
  produtoId: number
  usuarioId: number
  tipo: 'entrada' | 'saida'
  quantidade: number
  valorUnitario: number
  observacao: string | null
  dataHora: string
  usuario?: { id: number; nome: string }
  produto?: { id: number; codigo: string; descricao: string }
}

export type MovimentacaoTela = {
  id: number
  produtoId: number
  tipo: TipoMovimentacaoTela
  quantidade: number
  dataOcorrencia: string
  observacao: string
  usuarioResponsavel: string
}

export type PaginaMovimentacoes = {
  itens: MovimentacaoApi[]
  total: number
  pagina: number
  porPagina: number
}

export type SugestaoApi = {
  id: number
  status: StatusSugestao
  metodo: string
  consumoMedioDiario: number
  pontoReposicao: number
  quantidadeSugerida: number
  coberturaDias: number | null
  dataGeracao: string
  produto: {
    id: number
    codigo: string
    descricao: string
    categoria: string
    saldo: number
    estoqueMinimo: number
  }
}

export type ResumoGeracao = {
  analisados: number
  criadas: number
  atualizadas: number
  removidas: number
  puladasSemConsumo: number
  puladasSemNecessidade: number
}

export type ErroApi = {
  erro: string
  campos?: Record<string, string>
}

export type DadosFormularioProduto = {
  id?: number
  codigo: string
  descricao: string
  categoria: string
  quantidade: string | number
  estoqueMinimo: string | number
  valorUnitario: string | number
}

export type ConsumoDia = {
  dia: string
  quantidade: number
}
