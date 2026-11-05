import { pathToFileURL } from 'node:url'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../src/generated/prisma/client.ts'

const DIAS_HISTORICO = 90
const SENHA_DEMO = '123456'
const LOTE_INSERCAO = 400

const CATEGORIAS = [
  { nome: 'Mercearia', cor: '#1D4ED8' },
  { nome: 'Laticínios', cor: '#0D9488' },
  { nome: 'Bebidas', cor: '#D97706' },
  { nome: 'Limpeza', cor: '#7C3AED' },
  { nome: 'Higiene', cor: '#DB2777' },
]

// giro: unidades num dia comum. fds/calor: multiplicadores. aCada: vende só de N em N dias.
// drenar: nos últimos 12 dias não repõe, para o saldo poder terminar no mínimo.
const PRODUTOS = [
  { codigo: 'ARZ-001', descricao: 'Arroz Tipo 1 5kg', categoria: 'Mercearia', minimo: 15, venda: '27.90', custo: '18.40', giro: 2, fds: 1.2, calor: 1, aCada: 1, lote: 30, alvo: 42 },
  { codigo: 'FEJ-002', descricao: 'Feijão Carioca 1kg', categoria: 'Mercearia', minimo: 12, venda: '8.49', custo: '5.60', giro: 2, fds: 1.1, calor: 1, aCada: 1, lote: 24, alvo: 8, drenar: true },
  { codigo: 'CAF-003', descricao: 'Café Torrado 500g', categoria: 'Mercearia', minimo: 10, venda: '17.90', custo: '11.80', giro: 2, fds: 1.3, calor: 1, aCada: 1, lote: 20, alvo: 12 },
  { codigo: 'OLE-005', descricao: 'Óleo de Soja 900ml', categoria: 'Mercearia', minimo: 12, venda: '7.99', custo: '5.40', giro: 1, fds: 1.2, calor: 1, aCada: 1, lote: 24, alvo: 30 },
  { codigo: 'ACU-006', descricao: 'Açúcar Refinado 1kg', categoria: 'Mercearia', minimo: 10, venda: '4.79', custo: '3.10', giro: 2, fds: 1.4, calor: 1, aCada: 1, lote: 24, alvo: 25 },
  { codigo: 'MAC-011', descricao: 'Macarrão Espaguete 500g', categoria: 'Mercearia', minimo: 12, venda: '4.49', custo: '2.70', giro: 3, fds: 1.2, calor: 1, aCada: 1, lote: 30, alvo: 28 },
  { codigo: 'FAR-012', descricao: 'Farinha de Trigo 1kg', categoria: 'Mercearia', minimo: 8, venda: '5.29', custo: '3.40', giro: 1, fds: 1.5, calor: 1, aCada: 1, lote: 16, alvo: 18 },
  { codigo: 'BIS-013', descricao: 'Biscoito Cream Cracker 400g', categoria: 'Mercearia', minimo: 10, venda: '6.99', custo: '4.20', giro: 2, fds: 1.6, calor: 1, aCada: 1, lote: 20, alvo: 16 },
  { codigo: 'MOL-014', descricao: 'Molho de Tomate 340g', categoria: 'Mercearia', minimo: 10, venda: '3.19', custo: '1.90', giro: 2, fds: 1.3, calor: 1, aCada: 1, lote: 24, alvo: 22 },
  { codigo: 'SAL-015', descricao: 'Sal Refinado 1kg', categoria: 'Mercearia', minimo: 6, venda: '2.49', custo: '1.20', giro: 1, fds: 1, calor: 1, aCada: 3, lote: 12, alvo: 14 },
  { codigo: 'ACH-016', descricao: 'Achocolatado 400g', categoria: 'Mercearia', minimo: 8, venda: '9.90', custo: '6.50', giro: 1, fds: 1.4, calor: 0.8, aCada: 1, lote: 12, alvo: 11 },
  { codigo: 'LEI-004', descricao: 'Leite Integral 1L', categoria: 'Laticínios', minimo: 24, venda: '5.29', custo: '3.90', giro: 8, fds: 1.15, calor: 1.05, aCada: 1, lote: 48, alvo: 6, drenar: true },
  { codigo: 'IOG-017', descricao: 'Iogurte Natural 170g', categoria: 'Laticínios', minimo: 16, venda: '2.79', custo: '1.70', giro: 4, fds: 1.2, calor: 1.3, aCada: 1, lote: 36, alvo: 20 },
  { codigo: 'MAN-018', descricao: 'Manteiga com Sal 200g', categoria: 'Laticínios', minimo: 8, venda: '12.90', custo: '8.70', giro: 1, fds: 1.5, calor: 1, aCada: 1, lote: 12, alvo: 10 },
  { codigo: 'QUE-019', descricao: 'Queijo Mussarela fatiado 150g', categoria: 'Laticínios', minimo: 8, venda: '11.50', custo: '7.80', giro: 2, fds: 1.8, calor: 1, aCada: 1, lote: 16, alvo: 9 },
  { codigo: 'REF-007', descricao: 'Refrigerante Cola 2L', categoria: 'Bebidas', minimo: 12, venda: '9.99', custo: '6.40', giro: 3, fds: 2.2, calor: 1.5, aCada: 1, lote: 24, alvo: 20 },
  { codigo: 'AGU-020', descricao: 'Água Mineral 1,5L', categoria: 'Bebidas', minimo: 18, venda: '2.99', custo: '1.40', giro: 6, fds: 1.8, calor: 1.6, aCada: 1, lote: 36, alvo: 24 },
  { codigo: 'SUC-021', descricao: 'Suco de Laranja 1L', categoria: 'Bebidas', minimo: 8, venda: '8.49', custo: '5.30', giro: 2, fds: 1.7, calor: 1.4, aCada: 1, lote: 18, alvo: 10 },
  { codigo: 'CER-022', descricao: 'Cerveja Lata 350ml', categoria: 'Bebidas', minimo: 24, venda: '3.79', custo: '2.40', giro: 4, fds: 2.6, calor: 1.5, aCada: 1, lote: 48, alvo: 30 },
  { codigo: 'ENE-023', descricao: 'Energético 250ml', categoria: 'Bebidas', minimo: 8, venda: '7.49', custo: '4.60', giro: 1, fds: 1.8, calor: 1.2, aCada: 1, lote: 12, alvo: 9 },
  { codigo: 'DET-008', descricao: 'Detergente Líquido 500ml', categoria: 'Limpeza', minimo: 10, venda: '2.49', custo: '1.35', giro: 2, fds: 1.1, calor: 1, aCada: 1, lote: 24, alvo: 4, drenar: true },
  { codigo: 'SAB-009', descricao: 'Sabão em Pó 1kg', categoria: 'Limpeza', minimo: 6, venda: '12.90', custo: '8.20', giro: 1, fds: 1.2, calor: 1, aCada: 2, lote: 12, alvo: 14 },
  { codigo: 'SAN-024', descricao: 'Água Sanitária 2L', categoria: 'Limpeza', minimo: 8, venda: '6.49', custo: '3.80', giro: 1, fds: 1, calor: 1.1, aCada: 3, lote: 12, alvo: 3, drenar: true },
  { codigo: 'ESP-025', descricao: 'Esponja de Louça', categoria: 'Limpeza', minimo: 10, venda: '1.99', custo: '0.80', giro: 1, fds: 1, calor: 1, aCada: 2, lote: 20, alvo: 18 },
  { codigo: 'DES-026', descricao: 'Desinfetante 2L', categoria: 'Limpeza', minimo: 6, venda: '8.90', custo: '5.10', giro: 1, fds: 1.2, calor: 1.1, aCada: 2, lote: 12, alvo: 8 },
  { codigo: 'PAP-010', descricao: 'Papel Higiênico 12 rolos', categoria: 'Higiene', minimo: 8, venda: '19.90', custo: '12.40', giro: 1, fds: 1.1, calor: 1, aCada: 2, lote: 12, alvo: 16 },
  { codigo: 'SBT-027', descricao: 'Sabonete 90g', categoria: 'Higiene', minimo: 12, venda: '2.29', custo: '1.10', giro: 2, fds: 1.1, calor: 1.2, aCada: 1, lote: 24, alvo: 20 },
  { codigo: 'CRE-028', descricao: 'Creme Dental 90g', categoria: 'Higiene', minimo: 8, venda: '4.59', custo: '2.60', giro: 1, fds: 1, calor: 1, aCada: 2, lote: 16, alvo: 12 },
  { codigo: 'SHA-029', descricao: 'Shampoo 350ml', categoria: 'Higiene', minimo: 6, venda: '14.90', custo: '8.90', giro: 1, fds: 1.2, calor: 1, aCada: 3, lote: 10, alvo: 7 },
  { codigo: 'ABS-030', descricao: 'Absorvente 8 unidades', categoria: 'Higiene', minimo: 8, venda: '6.79', custo: '3.90', giro: 1, fds: 1, calor: 1, aCada: 2, lote: 16, alvo: 11 },
]

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Defina DIRECT_URL (ou DATABASE_URL) no .env antes de rodar o seed.')
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
})

function dataEm(diasAtras, hora) {
  const data = new Date()
  data.setHours(hora, 0, 0, 0)
  data.setDate(data.getDate() - diasAtras)
  return data
}

function fimDeSemana(data) {
  const dia = data.getDay()
  return dia === 0 || dia === 5 || dia === 6
}

function demandaDoDia(produto, data, diasAtras) {
  if (produto.aCada > 1 && diasAtras % produto.aCada !== 0) return 0
  let quantidade = produto.giro
  if (fimDeSemana(data)) quantidade = Math.round(quantidade * produto.fds)
  if (diasAtras > 50) quantidade = Math.round(quantidade * produto.calor)
  return Math.max(0, quantidade)
}

function montarHistorico(produtosPorCodigo, adminId, operadorId) {
  const movimentos = []

  for (const produto of PRODUTOS) {
    const produtoId = produtosPorCodigo.get(produto.codigo)
    let saldo = 0

    for (let diasAtras = DIAS_HISTORICO; diasAtras >= 1; diasAtras -= 1) {
      const data = dataEm(diasAtras, 8)
      let saida = demandaDoDia(produto, data, diasAtras)
      const drenando = produto.drenar && diasAtras <= 12

      if (saida > saldo && !drenando) {
        const lote = Math.max(produto.lote, saida - saldo)
        movimentos.push({
          produtoId,
          usuarioId: adminId,
          tipo: 'entrada',
          quantidade: lote,
          valorUnitario: produto.custo,
          observacao: 'Compra do fornecedor',
          dataHora: data,
        })
        saldo += lote
      }

      if (saida > saldo) saida = saldo
      if (saida > 0) {
        const venda = dataEm(diasAtras, 18)
        movimentos.push({
          produtoId,
          usuarioId: operadorId,
          tipo: 'saida',
          quantidade: saida,
          valorUnitario: produto.venda,
          observacao: fimDeSemana(venda) ? 'Vendas do fim de semana' : 'Vendas do dia',
          dataHora: venda,
        })
        saldo -= saida
      }
    }

    if (saldo < produto.alvo) {
      movimentos.push({
        produtoId,
        usuarioId: adminId,
        tipo: 'entrada',
        quantidade: produto.alvo - saldo,
        valorUnitario: produto.custo,
        observacao: 'Reposição semanal',
        dataHora: dataEm(0, 8),
      })
    } else if (saldo > produto.alvo) {
      movimentos.push({
        produtoId,
        usuarioId: operadorId,
        tipo: 'saida',
        quantidade: saldo - produto.alvo,
        valorUnitario: produto.venda,
        observacao: 'Vendas do dia',
        dataHora: dataEm(0, 18),
      })
    }
  }

  movimentos.sort((a, b) => a.dataHora - b.dataHora || (a.tipo === b.tipo ? 0 : a.tipo === 'entrada' ? -1 : 1))
  return movimentos
}

function conferirSaldo(movimentos) {
  const saldo = new Map()
  for (const movimento of movimentos) {
    const atual = saldo.get(movimento.produtoId) ?? 0
    const proximo = movimento.tipo === 'entrada' ? atual + movimento.quantidade : atual - movimento.quantidade
    if (movimento.quantidade <= 0 || proximo < 0) {
      throw new Error(`O seed geraria saldo inválido para o produto ${movimento.produtoId}.`)
    }
    saldo.set(movimento.produtoId, proximo)
  }
}

async function semear() {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10)

  for (const categoria of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nome: categoria.nome },
      update: { cor: categoria.cor },
      create: categoria,
    })
  }

  const admin = await prisma.usuario.upsert({
    where: { email: 'gestor@stockmind.com' },
    update: { nome: 'Ana Souza', senhaHash, perfil: 'admin', ativo: true },
    create: { nome: 'Ana Souza', email: 'gestor@stockmind.com', senhaHash, perfil: 'admin' },
  })
  const operador = await prisma.usuario.upsert({
    where: { email: 'operador@stockmind.com' },
    update: { nome: 'Carlos Lima', senhaHash, perfil: 'operador', ativo: true },
    create: { nome: 'Carlos Lima', email: 'operador@stockmind.com', senhaHash, perfil: 'operador' },
  })

  const categorias = await prisma.categoria.findMany()
  const categoriaPorNome = new Map(categorias.map((categoria) => [categoria.nome, categoria.id]))

  for (const produto of PRODUTOS) {
    const dados = {
      descricao: produto.descricao,
      categoriaId: categoriaPorNome.get(produto.categoria),
      estoqueMinimo: produto.minimo,
      valorCusto: produto.custo,
      valorVenda: produto.venda,
      qrCode: produto.codigo,
      ativo: true,
    }
    await prisma.produto.upsert({
      where: { codigo: produto.codigo },
      update: dados,
      create: { codigo: produto.codigo, quantidadeAtual: 0, ...dados },
    })
  }

  const jaTemHistorico = (await prisma.movimentacao.count()) > 0
  if (jaTemHistorico) {
    console.log('Movimentações já existem. Seed não duplicou o histórico.')
    return
  }

  const produtos = await prisma.produto.findMany({ select: { id: true, codigo: true } })
  const produtosPorCodigo = new Map(produtos.map((produto) => [produto.codigo, produto.id]))
  const movimentos = montarHistorico(produtosPorCodigo, admin.id, operador.id)
  conferirSaldo(movimentos)

  for (let inicio = 0; inicio < movimentos.length; inicio += LOTE_INSERCAO) {
    await prisma.movimentacao.createMany({ data: movimentos.slice(inicio, inicio + LOTE_INSERCAO) })
  }

  console.log(`Seed concluído: ${CATEGORIAS.length} categorias, ${PRODUTOS.length} produtos, ${movimentos.length} movimentações.`)
}

const executadoDireto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (executadoDireto) {
  try {
    await semear()
  } finally {
    await prisma.$disconnect()
  }
}
