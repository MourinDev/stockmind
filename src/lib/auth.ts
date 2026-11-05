import 'server-only'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { jsonErro } from './http'
import { nomeCookie, verificarSessao } from './sessao'

export async function lerSessao() {
  const jar = await cookies()
  const token = jar.get(nomeCookie())?.value
  const claims = await verificarSessao(token)
  if (!claims) return null

  const usuario = await prisma.usuario.findUnique({
    where: { id: claims.id },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  })
  if (!usuario || !usuario.ativo) return null

  return { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
}

export async function exigirSessao(perfisPermitidos) {
  const sessao = await lerSessao()
  if (!sessao) {
    return { sessao: null, resposta: jsonErro(401, 'Faça login para continuar.') }
  }
  if (perfisPermitidos && !perfisPermitidos.includes(sessao.perfil)) {
    return { sessao: null, resposta: jsonErro(403, 'Você não tem permissão para esta ação.') }
  }
  return { sessao, resposta: null }
}
