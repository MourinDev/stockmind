import { z } from 'zod'

const texto = (maximo: number) => z.string().trim().min(1, 'Campo obrigatório.').max(maximo)
const inteiroPositivo = z.number({ invalid_type_error: 'Informe um número inteiro.' }).int('Informe um número inteiro.').positive('Informe um número maior que zero.')
const inteiroNaoNegativo = z.number({ invalid_type_error: 'Informe um número inteiro.' }).int('Informe um número inteiro.').nonnegative('Não pode ser negativo.')
const preco = z.number({ invalid_type_error: 'Informe um valor.' }).positive('O valor deve ser maior que zero.').max(99999999.99)

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a data no formato AAAA-MM-DD.')

function inteiroDeQuery(valor: unknown, padrao: number) {
  if (valor === undefined || valor === '') return padrao
  return valor
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').max(160).email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.').max(72),
}).strict()

export const produtoSchema = z.object({
  codigo: texto(20),
  descricao: texto(160),
  categoria: texto(40),
  estoqueMinimo: inteiroNaoNegativo,
  valorCusto: preco.optional(),
  valorVenda: preco,
}).strict()

export const filtroProdutosSchema = z.object({
  busca: z.string().trim().max(160).optional(),
  categoria: z.string().trim().max(40).optional(),
  estoqueBaixo: z.enum(['1', 'true']).optional(),
})

export const movimentacaoSchema = z.object({
  produtoId: inteiroPositivo,
  tipo: z.enum(['entrada', 'saida']),
  quantidade: inteiroPositivo,
  observacao: z.string().trim().max(240, 'A observação pode ter no máximo 240 caracteres.').optional(),
}).strict()

export const filtroMovimentacoesSchema = z.object({
  produtoId: z.preprocess((valor: unknown) => (valor === undefined || valor === '' ? undefined : valor), z.coerce.number().int().positive().optional()),
  tipo: z.enum(['entrada', 'saida']).optional(),
  de: dia.optional(),
  ate: dia.optional(),
  pagina: z.preprocess((valor) => inteiroDeQuery(valor, 1), z.coerce.number().int().positive()),
  porPagina: z.preprocess((valor) => inteiroDeQuery(valor, 100), z.coerce.number().int().min(1).max(100)),
})

export const filtroRelatorioSchema = z.object({
  de: dia.optional(),
  ate: dia.optional(),
})

export const filtroSugestoesSchema = z.object({
  status: z.preprocess((valor: unknown) => (valor === undefined || valor === '' ? undefined : valor), z.enum(['pendente', 'aceita', 'ignorada']).optional()),
})

export const decisaoSugestaoSchema = z.object({
  status: z.enum(['aceita', 'ignorada']),
}).strict()

export type LoginInput = z.infer<typeof loginSchema>
export type ProdutoInput = z.infer<typeof produtoSchema>
export type FiltroProdutos = z.infer<typeof filtroProdutosSchema>
export type MovimentacaoInput = z.infer<typeof movimentacaoSchema>
export type FiltroMovimentacoes = z.infer<typeof filtroMovimentacoesSchema>
export type FiltroRelatorio = z.infer<typeof filtroRelatorioSchema>
export type FiltroSugestoes = z.infer<typeof filtroSugestoesSchema>
export type DecisaoSugestao = z.infer<typeof decisaoSugestaoSchema>
