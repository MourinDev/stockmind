import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { assinarSessao, nomeCookie, opcoesCookie } from '../../../../lib/sessao'
import { errosZod, erroInterno, json, jsonErro, lerJson } from '../../../../lib/http'
import { loginSchema } from '../../../../lib/validacao'

export const runtime = 'nodejs'

const MENSAGEM = 'E-mail ou senha inválidos'

export async function POST(request: NextRequest) {
  try {
    const validado = loginSchema.safeParse(await lerJson(request))
    if (!validado.success) return errosZod(validado)

    const usuario = await prisma.usuario.findUnique({
      where: { email: validado.data.email.toLowerCase() },
    })
    const senhaOk = usuario ? await bcrypt.compare(validado.data.senha, usuario.senhaHash) : false
    if (!usuario || !usuario.ativo || !senhaOk) return jsonErro(401, MENSAGEM)

    const token = await assinarSessao({ id: usuario.id, perfil: usuario.perfil, nome: usuario.nome })
    const resposta = json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    })
    resposta.cookies.set(nomeCookie(), token, opcoesCookie())
    return resposta
  } catch (erro) {
    return erroInterno(erro, 'POST /api/auth/login')
  }
}
