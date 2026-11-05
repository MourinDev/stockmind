import 'server-only'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'

// O cliente vive no global do processo fora de produção, para o hot reload não abrir conexão nova.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function criarCliente() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não está definida. Copie .env.example para .env e preencha a connection pooled do Neon.',
    )
  }

  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? criarCliente()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
