/*
  Constantes visuais e parâmetros da IA.
  Produtos, movimentações e usuários vêm do banco. As telas não usam mais mock.
*/

export const CATEGORIAS = ['Mercearia', 'Laticínios', 'Bebidas', 'Limpeza', 'Higiene']

// Cada categoria tem sempre a mesma cor em todos os gráficos.
// Paleta conferida para daltonismo (as 5 cores se distinguem entre si).
export const COR_CATEGORIA = {
  Mercearia: '#1D4ED8',
  Laticínios: '#0D9488',
  Bebidas: '#D97706',
  Limpeza: '#7C3AED',
  Higiene: '#DB2777',
}

export const COR_ENTRADA = '#1D4ED8'
export const COR_SAIDA = '#0D9488'
export const COR_CLASSE = { A: '#1D4ED8', B: '#0D9488', C: '#D97706' }

// Parâmetros do módulo de IA (explicados na tela da StockMind IA)
export const JANELA_ANALISE_DIAS = 15 // período de histórico usado para medir o giro
export const PRAZO_ENTREGA_DIAS = 3 // tempo médio que o fornecedor leva para entregar

export function dataISO(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function diasAtras(quantidade) {
  const data = new Date()
  data.setDate(data.getDate() - quantidade)
  return dataISO(data)
}
