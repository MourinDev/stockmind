/*
  Constantes e dados iniciais (mock).
  Tudo aqui vai sair do PostgreSQL quando o back-end existir.
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

// Usuários de demonstração. No back-end real a senha fica só no banco, com hash
// (bcrypt), e o login devolve um token JWT. Aqui o token é apenas simbólico.
export const USUARIOS_DEMO = [
  { id: 1, nome: 'Ana Souza', email: 'gestor@stockmind.com', senha: '123456', cargo: 'Gestor' },
  { id: 2, nome: 'Carlos Lima', email: 'operador@stockmind.com', senha: '123456', cargo: 'Operador' },
]

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

export const PRODUTOS_INICIAIS = [
  { id: 1, codigo: 'ARZ-001', descricao: 'Arroz Tipo 1 5kg', categoria: 'Mercearia', quantidade: 42, estoqueMinimo: 15, valorUnitario: 27.9 },
  { id: 2, codigo: 'FEJ-002', descricao: 'Feijão Carioca 1kg', categoria: 'Mercearia', quantidade: 8, estoqueMinimo: 12, valorUnitario: 8.49 },
  { id: 3, codigo: 'CAF-003', descricao: 'Café Torrado 500g', categoria: 'Mercearia', quantidade: 12, estoqueMinimo: 10, valorUnitario: 17.9 },
  { id: 4, codigo: 'LEI-004', descricao: 'Leite Integral 1L', categoria: 'Laticínios', quantidade: 6, estoqueMinimo: 24, valorUnitario: 5.29 },
  { id: 5, codigo: 'OLE-005', descricao: 'Óleo de Soja 900ml', categoria: 'Mercearia', quantidade: 30, estoqueMinimo: 12, valorUnitario: 7.99 },
  { id: 6, codigo: 'ACU-006', descricao: 'Açúcar Refinado 1kg', categoria: 'Mercearia', quantidade: 25, estoqueMinimo: 10, valorUnitario: 4.79 },
  { id: 7, codigo: 'REF-007', descricao: 'Refrigerante Cola 2L', categoria: 'Bebidas', quantidade: 20, estoqueMinimo: 12, valorUnitario: 9.99 },
  { id: 8, codigo: 'DET-008', descricao: 'Detergente Líquido 500ml', categoria: 'Limpeza', quantidade: 4, estoqueMinimo: 10, valorUnitario: 2.49 },
  { id: 9, codigo: 'SAB-009', descricao: 'Sabão em Pó 1kg', categoria: 'Limpeza', quantidade: 14, estoqueMinimo: 6, valorUnitario: 12.9 },
  { id: 10, codigo: 'PAP-010', descricao: 'Papel Higiênico 12 rolos', categoria: 'Higiene', quantidade: 16, estoqueMinimo: 8, valorUnitario: 19.9 },
]

export const MOVIMENTACOES_INICIAIS = [
  { id: 1, produtoId: 1, tipo: 'ENTRADA', quantidade: 30, dataOcorrencia: diasAtras(14), observacao: 'Compra do fornecedor', usuarioResponsavel: 'Ana Souza' },
  { id: 2, produtoId: 4, tipo: 'ENTRADA', quantidade: 48, dataOcorrencia: diasAtras(14), observacao: 'Compra do fornecedor', usuarioResponsavel: 'Ana Souza' },
  { id: 3, produtoId: 4, tipo: 'SAIDA', quantidade: 20, dataOcorrencia: diasAtras(12), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 4, produtoId: 1, tipo: 'SAIDA', quantidade: 8, dataOcorrencia: diasAtras(11), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 5, produtoId: 3, tipo: 'SAIDA', quantidade: 6, dataOcorrencia: diasAtras(10), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 6, produtoId: 2, tipo: 'SAIDA', quantidade: 10, dataOcorrencia: diasAtras(9), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 7, produtoId: 8, tipo: 'SAIDA', quantidade: 6, dataOcorrencia: diasAtras(8), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 8, produtoId: 7, tipo: 'ENTRADA', quantidade: 24, dataOcorrencia: diasAtras(7), observacao: 'Reposição semanal', usuarioResponsavel: 'Ana Souza' },
  { id: 9, produtoId: 4, tipo: 'SAIDA', quantidade: 22, dataOcorrencia: diasAtras(6), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 10, produtoId: 5, tipo: 'SAIDA', quantidade: 7, dataOcorrencia: diasAtras(5), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 11, produtoId: 7, tipo: 'SAIDA', quantidade: 10, dataOcorrencia: diasAtras(4), observacao: 'Vendas do fim de semana', usuarioResponsavel: 'Carlos Lima' },
  { id: 12, produtoId: 2, tipo: 'SAIDA', quantidade: 6, dataOcorrencia: diasAtras(3), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 13, produtoId: 1, tipo: 'SAIDA', quantidade: 6, dataOcorrencia: diasAtras(2), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
  { id: 14, produtoId: 8, tipo: 'SAIDA', quantidade: 3, dataOcorrencia: diasAtras(1), observacao: 'Perda: embalagem furada', usuarioResponsavel: 'Carlos Lima' },
  { id: 15, produtoId: 3, tipo: 'SAIDA', quantidade: 4, dataOcorrencia: diasAtras(1), observacao: 'Vendas do dia', usuarioResponsavel: 'Carlos Lima' },
]
